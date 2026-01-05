import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useContext } from 'react';
import { toast } from 'sonner';
import { AuthContext } from '../contexts/AuthContext';
import { BudgetStatus } from '../types';
import { vendasService, type Venda, type DashboardVendas } from '../services/vendasService';
import { orcamentosService } from '../services/orcamentosService';
import { clientesService } from '../services/clientesService';
import AlertDialog from './ui/AlertDialog';
import ActionsDropdown from './ui/ActionsDropdown';
import { canDelete } from '../utils/permissions';

import { useEscapeKey } from '../hooks/useEscapeKey';
import {
    generateExampleTemplate,
    exportToJSON,
    readJSONFile,
    validateImportData,
    type VendaTemplate,
    type ImportExportData,
} from '../utils/importExportTemplates';

// ==================== ICONS ====================
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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
const CurrencyDollarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.268-.268-1.268-.732 0-.464.543-.732 1.268-.732.725 0 1.268.268 1.268.732" />
    </svg>
);
const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);
const DocumentTextIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5-3H12M8.25 9h7.5" />
    </svg>
);
const CreditCardIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h16.5M6 18h12" />
    </svg>
);
const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);
const DocumentArrowDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);
const DocumentArrowUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

interface VendasProps {
    toggleSidebar: () => void;
}

interface VendaForm {
    orcamentoId: string;
    formaPagamento: string;
    parcelas: number;
    valorEntrada: number;
    observacoes?: string;
    dataPrimeiraParcela: string;
    observacoesComerciais?: string;
    condicoesEspeciaisPagamento?: string;
}

type TabType = 'nova' | 'lista' | 'dashboard' | 'config' | 'ajuda';

const Vendas: React.FC<VendasProps> = ({ toggleSidebar }) => {
    const { user } = useContext(AuthContext)!;
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    
    // Estado para meta mensal (salvo no localStorage)
    const [metaMensal, setMetaMensal] = useState<number>(() => {
        const saved = localStorage.getItem('vendas_meta_mensal');
        return saved ? parseFloat(saved) : 100000;
    });

    // Salvar meta no localStorage quando mudar
    useEffect(() => {
        localStorage.setItem('vendas_meta_mensal', metaMensal.toString());
    }, [metaMensal]);

    // Estados para nova venda
    const [vendaForm, setVendaForm] = useState<VendaForm>({
        orcamentoId: '',
        formaPagamento: 'À vista',
        parcelas: 1,
        valorEntrada: 0,
        observacoes: '',
        dataPrimeiraParcela: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        observacoesComerciais: '',
        condicoesEspeciaisPagamento: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Confirmação de venda
    const [confirmVendaOpen, setConfirmVendaOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Estados para dados da API
    const [vendas, setVendas] = useState<Venda[]>([]);
    const [orcamentosAprovados, setOrcamentosAprovados] = useState<any[]>([]);
    const [dashboardData, setDashboardData] = useState<DashboardVendas | null>(null);

    // Estados para modal de visualização
    const [vendaParaVisualizar, setVendaParaVisualizar] = useState<Venda | null>(null);
    const [modalVisualizarVenda, setModalVisualizarVenda] = useState(false);
    const [detalhesVenda, setDetalhesVenda] = useState<any>(null);
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);

    // Estados para importação/exportação
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Estados para modal de preview de importação
    const [modalPreviewImportOpen, setModalPreviewImportOpen] = useState(false);
    const [dadosParaImportar, setDadosParaImportar] = useState<{
        vendas: any[];
        erros: string[];
    } | null>(null);

    // Estados para busca e filtros de orçamentos
    const [buscaOrcamento, setBuscaOrcamento] = useState('');
    const [filtroCliente, setFiltroCliente] = useState('');

    // Estados para exclusão
    const [vendaToDelete, setVendaToDelete] = useState<Venda | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Carregar dados iniciais
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('🔍 Carregando dados de vendas...');
            
            const [vendasRes, orcamentosRes, dashboardRes] = await Promise.all([
                vendasService.listarVendas({ limit: 50 }),
                orcamentosService.listar({ status: 'Aprovado' }),
                vendasService.getDashboard()
            ]);

            console.log('📊 Resposta do serviço - Vendas:', vendasRes);
            console.log('📋 Resposta do serviço - Orçamentos:', orcamentosRes);
            console.log('📈 Resposta do serviço - Dashboard:', dashboardRes);

            // Tratar vendas
            if (vendasRes.success && vendasRes.data) {
                setVendas(vendasRes.data.vendas || []);
                console.log(`✅ ${vendasRes.data.vendas?.length || 0} vendas carregadas`);
            } else {
                console.warn('⚠️ Erro ao carregar vendas:', vendasRes.error);
                setVendas([]);
            }

            // Tratar orçamentos aprovados
            if (orcamentosRes.success && orcamentosRes.data) {
                setOrcamentosAprovados(orcamentosRes.data);
                console.log(`✅ ${orcamentosRes.data.length} orçamentos aprovados carregados`);
            } else {
                console.warn('⚠️ Erro ao carregar orçamentos:', orcamentosRes.error);
                setOrcamentosAprovados([]);
            }

            // Tratar dashboard
            if (dashboardRes.success && dashboardRes.data) {
                setDashboardData(dashboardRes.data);
                console.log('✅ Dashboard de vendas carregado');
            } else {
                console.warn('⚠️ Erro ao carregar dashboard:', dashboardRes.error);
                setDashboardData(null);
            }

        } catch (err) {
            console.error('❌ Erro crítico ao carregar dados:', err);
            setError('Erro de conexão ao carregar dados');
            setVendas([]);
            setOrcamentosAprovados([]);
            setDashboardData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Função para abrir modal de visualização e buscar detalhes da venda
    const abrirModalVisualizarVenda = async (venda: Venda) => {
        setVendaParaVisualizar(venda);
        setModalVisualizarVenda(true);

    };

    // Fechar modais com ESC
    useEscapeKey(modalVisualizarVenda, () => {
        setModalVisualizarVenda(false);
        setVendaParaVisualizar(null);
    });
    useEscapeKey(modalPreviewImportOpen, () => setModalPreviewImportOpen(false));

    const abrirModalVisualizarVendaCompleto = async (venda: Venda) => {
        setVendaParaVisualizar(venda);
        setModalVisualizarVenda(true);
        setLoadingDetalhes(true);
        setDetalhesVenda(null); // Limpar detalhes anteriores

        try {
            // Buscar detalhes completos da venda
            const vendaRes = await vendasService.buscarVenda(venda.id);
            
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

                console.error('Erro na resposta do serviço:', vendaRes);
                toast.error('Erro ao carregar detalhes da venda', {
                    description: vendaRes.error || 'Não foi possível carregar os detalhes'
                });
                setDetalhesVenda(null);
            }
        } catch (error: any) {
            console.error('Erro ao buscar detalhes da venda:', error);
            toast.error('Erro ao carregar detalhes da venda', {
                description: error?.message || 'Erro de conexão'
            });
            setDetalhesVenda(null);
        } finally {
            setLoadingDetalhes(false);
        }
    };

    // Orçamento selecionado
    const orcamentoSelecionado = useMemo(() => {
        if (!vendaForm.orcamentoId) return null;
        return orcamentosAprovados.find(orc => orc.id === vendaForm.orcamentoId) || null;
    }, [vendaForm.orcamentoId, orcamentosAprovados]);

    // Orçamentos filtrados para exibição
    const orcamentosFiltrados = useMemo(() => {
        let filtrados = orcamentosAprovados;

        // Filtro por busca (título, cliente, número)
        if (buscaOrcamento.trim()) {
            const buscaLower = buscaOrcamento.toLowerCase();
            filtrados = filtrados.filter(orc => 
                orc.titulo?.toLowerCase().includes(buscaLower) ||
                orc.cliente?.nome?.toLowerCase().includes(buscaLower) ||
                orc.numeroSequencial?.toString().includes(buscaLower) ||
                orc.id?.toLowerCase().includes(buscaLower)
            );
        }

        // Filtro por cliente
        if (filtroCliente) {
            filtrados = filtrados.filter(orc => orc.clienteId === filtroCliente);
        }

        return filtrados;
    }, [orcamentosAprovados, buscaOrcamento, filtroCliente]);

    // Lista de clientes únicos para filtro
    const clientesUnicos = useMemo(() => {
        const clientesMap = new Map();
        orcamentosAprovados.forEach(orc => {
            if (orc.cliente && !clientesMap.has(orc.cliente.id)) {
                clientesMap.set(orc.cliente.id, orc.cliente);
            }
        });
        return Array.from(clientesMap.values());
    }, [orcamentosAprovados]);

    // Cálculos financeiros automáticos
    const calculosFinanceiros = useMemo(() => {
        const valorTotal = orcamentoSelecionado?.precoVenda || 0;
        const valorEntrada = vendaForm.valorEntrada || 0;
        const valorFinanciado = Math.max(0, valorTotal - valorEntrada);
        const numeroParcelas = vendaForm.parcelas || 1;
        const valorParcela = numeroParcelas > 0 ? valorFinanciado / numeroParcelas : 0;

        return {
            valorTotal,
            valorFinanciado,
            valorParcela
        };
    }, [orcamentoSelecionado, vendaForm.valorEntrada, vendaForm.parcelas]);

    // Estatísticas calculadas em TEMPO REAL
    const estatisticasVendas = useMemo(() => {
        // Calcular do zero baseado nas vendas reais
        const totalVendas = vendas.reduce((acc, venda) => acc + (venda.valorTotal || 0), 0);
        const vendasMesCount = vendas.length;
        const ticketMedio = vendasMesCount > 0 ? totalVendas / vendasMesCount : 0;
        
        // Se tiver dados do dashboard, usar como referência mas sempre calcular
        const receitaReal = dashboardData?.receitaMes || totalVendas;
        const vendasReal = dashboardData?.vendasMes || vendasMesCount;
        
        return {
            totalVendas: receitaReal,
            vendasMes: vendasReal,
            ticketMedio: vendasReal > 0 ? receitaReal / vendasReal : ticketMedio,
            metaMes: metaMensal, // Usa meta configurável
            percentualMeta: metaMensal > 0 ? (receitaReal / metaMensal) * 100 : 0
        };
    }, [dashboardData, vendas, metaMensal]);

    const formasPagamento = [
        'À vista',
        'Cartão de crédito',
        'Boleto integral',
        'Boleto parcelado'
    ];

    const getItemTipoVenda = (item: any) => String(item?.tipo || '').toUpperCase();
    const getItemNomeVenda = (item: any): string => {
        const tipo = getItemTipoVenda(item);
        if ((tipo === 'COTACAO' || tipo === 'BANCO_FRIO') && (item.cotacao?.nome || item.nome)) {
            return item.cotacao?.nome || item.nome;
        }
        if (tipo === 'MATERIAL' && (item.material?.nome || item.materialNome)) {
            return item.material?.nome || item.materialNome;
        }
        if (tipo === 'KIT' && item.kit?.nome) {
            return item.kit.nome;
        }
        if (tipo === 'SERVICO') {
            return item.servicoNome || item.descricao || 'Serviço';
        }
        return item.nome || item.descricao || item.material?.nome || item.cotacao?.nome || 'Item';
    };
    const getItemDataBancoFrioVenda = (item: any): string | null => {
        const tipo = getItemTipoVenda(item);
        if (tipo === 'COTACAO' || tipo === 'BANCO_FRIO' || item.cotacaoId || item.cotacao) {
            return (
                item.cotacao?.dataAtualizacao ||
                item.cotacao?.updatedAt ||
                item.dataAtualizacaoCotacao ||
                item.dataImportacao ||
                item.cotacao?.createdAt ||
                null
            );
        }
        return null;
    };

    const handleSubmitVenda = async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }
        if (!orcamentoSelecionado) return;

        setIsSubmitting(true);
        setError(null);
        
        try {
            console.log('💰 Realizando nova venda...', vendaForm);

            const vendaData = {
                orcamentoId: vendaForm.orcamentoId,
                clienteId: orcamentoSelecionado.clienteId,
                valorTotal: orcamentoSelecionado.precoVenda, // ✅ Campo obrigatório
                formaPagamento: vendaForm.formaPagamento,
                numeroParcelas: vendaForm.parcelas,
                valorEntrada: vendaForm.valorEntrada,
                valorFinanciado: calculosFinanceiros.valorFinanciado,
                dataVencimentoPrimeiraParcela: vendaForm.dataPrimeiraParcela,
                observacoes: vendaForm.observacoes,
                observacoesComerciais: vendaForm.observacoesComerciais,
                condicoesEspeciaisPagamento: vendaForm.condicoesEspeciaisPagamento
            };

            console.log('📤 Enviando dados da venda:', vendaData);

            const response = await vendasService.realizarVenda(vendaData);

            console.log('📥 Resposta do servidor:', response);

            if (response.success) {
                console.log('✅ Venda realizada com sucesso');
                toast.success(response.message || '✅ Venda registrada com sucesso!');
                
                // Resetar formulário
                setVendaForm({
                    orcamentoId: '',
                    formaPagamento: 'À vista',
                    parcelas: 1,
                    valorEntrada: 0,
                    observacoes: '',
                    dataPrimeiraParcela: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    observacoesComerciais: '',
                    condicoesEspeciaisPagamento: ''
                });
                
                // Recarregar dados
                await loadData();
                setActiveTab('lista');
            } else {
                const errorMsg = response.error || 'Erro ao registrar venda';
                console.warn('⚠️ Erro ao realizar venda:', errorMsg);
                setError(errorMsg);
                
                // Verificar se é erro de venda duplicada
                if (errorMsg.includes('Já existe uma venda')) {
                    toast.error('Venda Duplicada', {
                        description: errorMsg,
                        duration: 7000
                    });
                } else {
                    toast.error(`❌ ${errorMsg}`);
                }
            }
        } catch (err: any) {
            console.error('❌ Erro crítico ao realizar venda:', err);
            const errorMsg = err?.response?.data?.error || err?.message || 'Erro de conexão ao registrar venda';
            setError(errorMsg);
            
            if (errorMsg.includes('Já existe uma venda')) {
                toast.error('Venda Duplicada', {
                    description: errorMsg,
                    duration: 7000
                });
            } else {
                toast.error(`❌ ${errorMsg}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Excluir venda
    const handleDeleteVenda = async () => {
        if (!vendaToDelete) return;

        const response = await vendasService.excluir(vendaToDelete.id);
        
        if (response.success) {
            toast.success('Venda excluída', {
                description: `Venda do cliente "${vendaToDelete.cliente?.nome || 'N/A'}" foi excluída permanentemente`
            });
            await loadData();
        } else {
            toast.error('Erro ao excluir', {
                description: response.error || 'Não foi possível excluir a venda'
            });
        }

        setShowDeleteDialog(false);
        setVendaToDelete(null);
    };

    // Funções de Exportação/Importação
    const handleExportTemplate = () => {
        try {
            const template = generateExampleTemplate('vendas');
            exportToJSON(template, `template_vendas_${new Date().toISOString().split('T')[0]}.json`);
            toast.success('✅ Template exportado com sucesso!');
        } catch (error) {
            console.error('Erro ao exportar template:', error);
            toast.error('❌ Erro ao exportar template');
        }
    };

    const handleExportData = () => {
        try {
            const template: ImportExportData = {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                vendas: vendas.map(venda => {
                    // Mapear itens do orçamento para o formato de exportação
                    const items = venda.orcamento?.items?.map((item: any) => ({
                        tipo: item.tipo || 'MATERIAL',
                        materialId: item.materialId,
                        materialNome: item.material?.nome || item.materialNome,
                        kitId: item.kitId,
                        kitNome: item.kit?.nome || item.kitNome,
                        servicoId: item.servicoId,
                        servicoNome: item.servico?.nome || item.servicoNome,
                        quadroId: item.quadroId,
                        quadroNome: item.quadro?.nome || item.quadroNome,
                        cotacaoId: item.cotacaoId,
                        cotacaoNome: item.cotacao?.nome || item.cotacaoNome,
                        nome: item.nome || item.material?.nome || item.descricao || 'Item',
                        descricao: item.descricao || '',
                        unidadeMedida: item.unidadeMedida || item.material?.unidadeMedida || 'UN',
                        quantidade: item.quantidade || 1,
                        ncm: item.cotacao?.ncm || item.material?.ncm || '', // ✅ NCM para faturamento
                        custoUnit: item.custoUnitario || item.custoUnit || item.material?.preco || 0,
                        // Usar valorVenda do material se disponível, senão usar precoUnit do orçamento
                        precoUnit: item.material?.valorVenda || item.precoUnitario || item.precoUnit || 0,
                        subtotal: item.subtotal || ((item.material?.valorVenda || item.precoUnitario || item.precoUnit || 0) * (item.quantidade || 1)),
                    })) || [];

                    // Calcular valor total se não existir
                    const subtotalItens = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
                    const valorFrete = venda.orcamento?.valorFrete || 0;
                    const valorDesconto = venda.orcamento?.descontoValor || 0;
                    const valorTotalCalculado = subtotalItens + valorFrete - valorDesconto;

                    return {
                        orcamentoId: venda.orcamentoId,
                        orcamentoNumero: venda.orcamento?.numeroSequencial?.toString(),
                        clienteId: venda.clienteId,
                        clienteNome: venda.cliente?.nome || venda.orcamento?.cliente?.nome,
                        formaPagamento: venda.formaPagamento,
                        numeroParcelas: venda.numeroParcelas,
                        dataVenda: venda.dataVenda,
                        dataVencimentoPrimeiraParcela: venda.dataVencimentoPrimeiraParcela,
                        observacoes: venda.observacoes,
                        valorTotal: venda.valorTotal || valorTotalCalculado,
                        valorFrete: valorFrete,
                        valorDesconto: valorDesconto,
                        items: items.length > 0 ? items : undefined,
                    };
                }),
            };
            exportToJSON(template, `vendas_export_${new Date().toISOString().split('T')[0]}.json`);
            toast.success(`✅ ${vendas.length} venda(s) exportada(s) com sucesso!`);
        } catch (error) {
            console.error('Erro ao exportar vendas:', error);
            toast.error('❌ Erro ao exportar vendas');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setImporting(true);
            const data = await readJSONFile(file);
            
            // Validar estrutura
            const validation = validateImportData(data);
            if (!validation.valid) {
                toast.error('❌ Erro na validação do arquivo: ' + validation.errors.join(', '));
                return;
            }

            if (!data.vendas || data.vendas.length === 0) {
                toast.error('❌ O arquivo não contém vendas para importar');
                return;
            }

            // Preparar dados para preview
            const vendasPreview: any[] = [];
            const erros: string[] = [];

            // Validar cada venda antes de mostrar no preview
            for (const vendaTemplate of data.vendas) {
                const errosVenda: string[] = [];
                
                // Buscar orçamento por número ou ID
                let orcamentoId = vendaTemplate.orcamentoId;
                if (!orcamentoId && vendaTemplate.orcamentoNumero) {
                    const orcamento = orcamentosAprovados.find(
                        o => o.numeroSequencial?.toString() === vendaTemplate.orcamentoNumero
                    );
                    if (orcamento) {
                        orcamentoId = orcamento.id;
                    } else {
                        errosVenda.push(`Orçamento ${vendaTemplate.orcamentoNumero} não encontrado`);
                    }
                }

                if (!orcamentoId) {
                    errosVenda.push('Orçamento não informado ou inválido');
                }

                // Buscar cliente por nome se não tiver ID
                let clienteId = vendaTemplate.clienteId;
                let clienteNome = vendaTemplate.clienteNome || '';
                if (!clienteId && vendaTemplate.clienteNome) {
                    const orcamento = orcamentosAprovados.find(o => o.id === orcamentoId);
                    if (orcamento?.clienteId) {
                        clienteId = orcamento.clienteId;
                        clienteNome = orcamento.cliente?.nome || vendaTemplate.clienteNome;
                    } else {
                        errosVenda.push(`Cliente ${vendaTemplate.clienteNome} não encontrado`);
                    }
                }

                if (!clienteId) {
                    errosVenda.push('Cliente não informado ou inválido');
                }

                vendasPreview.push({
                    ...vendaTemplate,
                    orcamentoId,
                    clienteId,
                    clienteNome,
                    errosVenda,
                });

                if (errosVenda.length > 0) {
                    erros.push(`Venda ${vendaTemplate.orcamentoNumero || 'sem número'}: ${errosVenda.join(', ')}`);
                }
            }

            // Mostrar preview
            setDadosParaImportar({
                vendas: vendasPreview,
                erros,
            });
            setModalPreviewImportOpen(true);

            // Limpar input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Erro ao importar arquivo:', error);
            toast.error('❌ Erro ao importar arquivo: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
        } finally {
            setImporting(false);
        }
    };

    const handleConfirmarImportacao = async () => {
        if (!dadosParaImportar) return;

        try {
            setImporting(true);
            let successCount = 0;
            let errorCount = 0;

            // Importar apenas vendas válidas (sem erros)
            for (const vendaTemplate of dadosParaImportar.vendas) {
                if (vendaTemplate.errosVenda && vendaTemplate.errosVenda.length > 0) {
                    errorCount++;
                    continue;
                }

                try {
                    const vendaData = {
                        orcamentoId: vendaTemplate.orcamentoId,
                        clienteId: vendaTemplate.clienteId,
                        formaPagamento: vendaTemplate.formaPagamento,
                        numeroParcelas: vendaTemplate.numeroParcelas,
                        dataVencimentoPrimeiraParcela: vendaTemplate.dataVencimentoPrimeiraParcela || vendaTemplate.dataVenda,
                        observacoes: vendaTemplate.observacoes,
                    };

                    const response = await vendasService.realizarVenda(vendaData);
                    if (response.success) {
                        successCount++;
                    } else {
                        errorCount++;
                        console.error('Erro ao criar venda:', response.error);
                    }
                } catch (error) {
                    errorCount++;
                    console.error('Erro ao importar venda:', error);
                }
            }

            setModalPreviewImportOpen(false);
            setDadosParaImportar(null);

            toast.success(`✅ Importação concluída! ${successCount} venda(s) importada(s), ${errorCount} erro(s)`);
            await loadData(); // Recarregar lista
        } catch (error) {
            console.error('Erro ao confirmar importação:', error);
            toast.error('❌ Erro ao confirmar importação');
        } finally {
            setImporting(false);
        }
    };

    const renderDashboard = () => (
        <div className="space-y-6">
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                            <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total em Vendas</p>
                            <p className="text-2xl font-bold text-green-600">
                                R$ {(estatisticasVendas.totalVendas || 0).toLocaleString('pt-BR')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                            <ChartBarIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Vendas no Mês</p>
                            <p className="text-2xl font-bold text-blue-600">{estatisticasVendas.vendasMes || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                            <DocumentTextIcon className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                            <p className="text-2xl font-bold text-purple-600">
                                R$ {(estatisticasVendas.ticketMedio || 0).toLocaleString('pt-BR')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                            <CreditCardIcon className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Meta do Mês</p>
                            <p className="text-2xl font-bold text-orange-600">
                                R$ {(estatisticasVendas.metaMes || 100000).toLocaleString('pt-BR')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Bar da Meta */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Progresso da Meta Mensal</h3>
                    <span className={`text-lg font-bold ${estatisticasVendas.percentualMeta >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                        {estatisticasVendas.percentualMeta.toFixed(1)}%
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                        className={`h-4 rounded-full transition-all duration-500 ${
                            estatisticasVendas.percentualMeta >= 100 
                                ? 'bg-gradient-to-r from-green-500 to-green-600' 
                                : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}
                        style={{ width: `${Math.min(estatisticasVendas.percentualMeta, 100)}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-600">
                    <span>R$ {estatisticasVendas.totalVendas.toLocaleString('pt-BR')}</span>
                    <span>R$ {estatisticasVendas.metaMes.toLocaleString('pt-BR')}</span>
                </div>
                {estatisticasVendas.percentualMeta >= 100 && (
                    <div className="mt-4 bg-green-100 border border-green-300 p-3 rounded-lg">
                        <p className="text-sm text-green-800 font-semibold text-center">
                            🎉 Parabéns! Meta do mês alcançada!
                        </p>
                    </div>
                )}
            </div>

            {/* Vendas Recentes */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendas Recentes</h3>
                <div className="space-y-4">
                    {vendas.length > 0 ? (
                        vendas.slice(0, 5).map((venda) => (
                            <div key={venda.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="font-semibold text-gray-900">{venda.cliente?.nome || 'Cliente'}</p>
                                    <p className="text-sm text-gray-600">{venda.orcamento?.titulo || 'Projeto'}</p>
                                    <p className="text-xs text-gray-500">{new Date(venda.dataVenda).toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-green-600">
                                        R$ {(venda.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                        venda.status === 'Finalizada' 
                                            ? 'bg-green-100 text-green-800' 
                                            : venda.status === 'Ativa'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {venda.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <p>Nenhuma venda encontrada</p>
                            <p className="text-sm">As vendas aparecerão aqui quando forem criadas</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderNovaVenda = () => (
        <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-soft max-w-7xl mx-auto">
            {/* Header */}
            <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-green-600 to-green-700">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-medium">
                        <CurrencyDollarIcon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white">Nova Venda / Projeto</h2>
                        <p className="text-sm text-white/80 mt-1">
                            Converta um orçamento aprovado em venda e defina as condições financeiras
                        </p>
                    </div>
                </div>
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!orcamentoSelecionado) {
                        toast.error('Selecione um orçamento antes de registrar a venda.');
                        return;
                    }
                    setConfirmVendaOpen(true);
                }}
                className="p-6 space-y-6"
            >
                {/* SEÇÃO 1: Seleção de Orçamento - Layout Otimizado */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">📋</span>
                        Seleção do Orçamento/Projeto
                    </h3>
                    
                    {orcamentosAprovados.length === 0 ? (
                        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-6 flex items-start gap-3">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <p className="text-sm font-semibold text-orange-900 mb-1">
                                    Nenhum Orçamento Aprovado Disponível
                                </p>
                                <p className="text-xs text-orange-700">
                                    Para criar uma venda, você precisa primeiro aprovar um orçamento na página de <strong>Orçamentos</strong>. Vá até lá, selecione um orçamento em status "Pendente" e aprove-o para que ele apareça aqui.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Painel de Busca e Filtros - Lado Esquerdo */}
                            <div className="lg:col-span-1 space-y-4">
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                                    <h4 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                                        <MagnifyingGlassIcon className="w-5 h-5" />
                                        Buscar Orçamento
                                    </h4>
                                    
                                    {/* Campo de Busca */}
                                    <div className="mb-4">
                                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                                            🔍 Pesquisar
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={buscaOrcamento}
                                                onChange={(e) => setBuscaOrcamento(e.target.value)}
                                                placeholder="Título, cliente, número..."
                                                className="w-full px-4 py-3 pl-10 border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            />
                                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        </div>
                                    </div>

                                    {/* Filtro por Cliente */}
                                    {clientesUnicos.length > 0 && (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-2">
                                                👤 Filtrar por Cliente
                                            </label>
                                            <select
                                                value={filtroCliente}
                                                onChange={(e) => setFiltroCliente(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            >
                                                <option value="">Todos os clientes</option>
                                                {clientesUnicos.map(cliente => (
                                                    <option key={cliente.id} value={cliente.id}>
                                                        {cliente.nome}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Estatísticas */}
                                    <div className="mt-4 pt-4 border-t border-blue-200">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-600">Total encontrado:</span>
                                            <span className="font-bold text-blue-700">{orcamentosFiltrados.length} de {orcamentosAprovados.length}</span>
                                        </div>
                                    </div>
                                </div>

                                {!vendaForm.orcamentoId && (
                                    <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
                                        <p className="text-xs text-blue-800 font-medium">
                                            💡 <strong>Dica:</strong> Use a busca para encontrar rapidamente o orçamento desejado. Clique em um card para selecionar.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Lista de Orçamentos - Lado Direito */}
                            <div className="lg:col-span-2">
                                <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                                    <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <span>📋</span>
                                        Orçamentos Aprovados ({orcamentosFiltrados.length})
                                    </h4>
                                    
                                    {orcamentosFiltrados.length === 0 ? (
                                        <div className="text-center py-12">
                                            <p className="text-gray-500 font-medium mb-2">Nenhum orçamento encontrado</p>
                                            <p className="text-sm text-gray-400">Tente ajustar os filtros de busca</p>
                                        </div>
                                    ) : (
                                        <div className="max-h-[600px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                            {orcamentosFiltrados.map((orcamento) => {
                                                const isSelecionado = vendaForm.orcamentoId === orcamento.id;
                                                return (
                                                    <div
                                                        key={orcamento.id}
                                                        onClick={() => setVendaForm({...vendaForm, orcamentoId: orcamento.id})}
                                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                                                            isSelecionado
                                                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400 shadow-md'
                                                                : 'bg-gray-50 border-gray-200 hover:border-green-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <h5 className={`font-bold text-lg truncate ${isSelecionado ? 'text-green-800' : 'text-gray-900'}`}>
                                                                        {orcamento.titulo || 'Sem título'}
                                                                    </h5>
                                                                    {isSelecionado && (
                                                                        <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-lg">
                                                                            ✓ Selecionado
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                
                                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                                    <div>
                                                                        <span className="text-gray-600">Cliente:</span>
                                                                        <p className="font-semibold text-gray-900">{orcamento.cliente?.nome || 'N/A'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-600">Nº Orçamento:</span>
                                                                        <p className="font-mono text-gray-900">#{orcamento.numeroSequencial || orcamento.id?.slice(0, 8)}</p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-600">Itens:</span>
                                                                        <p className="font-semibold text-gray-900">{orcamento.items?.length || 0} item(s)</p>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-600">Data:</span>
                                                                        <p className="text-gray-900">
                                                                            {new Date(orcamento.createdAt || orcamento.dataCriacao || Date.now()).toLocaleDateString('pt-BR')}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="text-right">
                                                                <p className="text-2xl font-bold text-green-600">
                                                                    R$ {(orcamento.precoVenda || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </p>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setVendaForm({...vendaForm, orcamentoId: orcamento.id});
                                                                    }}
                                                                    className={`mt-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                                                        isSelecionado
                                                                            ? 'bg-green-600 text-white'
                                                                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                    }`}
                                                                >
                                                                    {isSelecionado ? '✓ Selecionado' : 'Selecionar'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* SEÇÃO 2: Informações do Projeto (Read-Only) */}
                {orcamentoSelecionado && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">🏢</span>
                            Informações do Projeto (Herdadas)
                        </h3>
                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white bg-opacity-70 p-4 rounded-lg">
                                    <h4 className="text-xs font-semibold text-purple-700 uppercase mb-1">Cliente</h4>
                                    <p className="text-gray-900 font-medium">{orcamentoSelecionado.cliente?.nome || 'N/A'}</p>
                                    <p className="text-xs text-gray-600 mt-1">{orcamentoSelecionado.cliente?.email || ''}</p>
                                </div>
                                <div className="bg-white bg-opacity-70 p-4 rounded-lg">
                                    <h4 className="text-xs font-semibold text-purple-700 uppercase mb-1">Projeto</h4>
                                    <p className="text-gray-900 font-medium">{orcamentoSelecionado.titulo || 'Projeto'}</p>
                                    <p className="text-xs text-gray-600 mt-1">Nº Orçamento: {orcamentoSelecionado.numeroOrcamento || orcamentoSelecionado.id?.slice(0, 8)}</p>
                                </div>
                                <div className="bg-white bg-opacity-70 p-4 rounded-lg">
                                    <h4 className="text-xs font-semibold text-purple-700 uppercase mb-1">Status</h4>
                                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-lg">
                                        ✅ Aprovado
                                    </span>
                                </div>
                                <div className="bg-white bg-opacity-70 p-4 rounded-lg">
                                    <h4 className="text-xs font-semibold text-purple-700 uppercase mb-1">Endereço da Obra</h4>
                                    <p className="text-sm text-gray-900">{orcamentoSelecionado.enderecoObra || orcamentoSelecionado.cliente?.endereco || 'Não especificado'}</p>
                                </div>
                                <div className="bg-white bg-opacity-70 p-4 rounded-lg">
                                    <h4 className="text-xs font-semibold text-purple-700 uppercase mb-1">Tipo de Projeto</h4>
                                    <p className="text-sm text-gray-900">{orcamentoSelecionado.tipoInstalacao || 'Instalação Elétrica'}</p>
                                </div>
                                <div className="bg-white bg-opacity-70 p-4 rounded-lg">
                                    <h4 className="text-xs font-semibold text-purple-700 uppercase mb-1">Itens/Serviços</h4>
                                    <p className="text-sm text-gray-900 font-medium">{orcamentoSelecionado.items?.length || 0} item(s)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SEÇÃO 3: Condições Financeiras (Inputs Ativos) */}
                {orcamentoSelecionado && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">💰</span>
                            Condições Financeiras
                        </h3>
                        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
                            {/* Valor Total (Read-Only) */}
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 p-6 rounded-xl">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="text-sm font-semibold text-green-700 uppercase mb-1">Valor Total do Projeto</h4>
                                        <p className="text-xs text-gray-600">Valor herdado do orçamento aprovado</p>
                                    </div>
                                    <p className="text-4xl font-bold text-green-700">
                                        R$ {calculosFinanceiros.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            {/* Lista de Itens/Serviços (Read-Only) */}
                            {orcamentoSelecionado?.items && orcamentoSelecionado.items.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <span className="text-green-600">📦</span>
                                        Itens/Serviços do Orçamento ({orcamentoSelecionado.items.length})
                                    </h4>
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        {/* Header da Tabela */}
                                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-3 grid grid-cols-12 gap-4 text-xs font-semibold text-gray-700 uppercase">
                                            <div className="col-span-4">Item/Serviço</div>
                                            <div className="col-span-1 text-center">NCM</div>
                                            <div className="col-span-2 text-center">Quantidade</div>
                                            <div className="col-span-2 text-right">Valor Unit.</div>
                                            <div className="col-span-3 text-right">Subtotal</div>
                                        </div>
                                        
                                        {/* Linhas de Itens */}
                                        <div className="divide-y divide-gray-200">
                                            {orcamentoSelecionado.items.map((item: any, index: number) => {
                                                const nomeItem = getItemNomeVenda(item);
                                                const dataFrio = getItemDataBancoFrioVenda(item);
                                                const isBancoFrio = getItemTipoVenda(item) === 'COTACAO' || getItemTipoVenda(item) === 'BANCO_FRIO' || item.cotacaoId || item.cotacao;
                                                // Obter NCM: prioridade para cotação, depois material
                                                const ncm = item.cotacao?.ncm || item.material?.ncm || '-';
                                                return (
                                                <div key={index} className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-gray-50 transition-colors">
                                                    <div className="col-span-4">
                                                        <p className="font-semibold text-gray-900">{nomeItem}</p>
                                                        {item.descricao && item.descricao !== nomeItem && (
                                                            <p className="text-xs text-gray-500 mt-1">{item.descricao}</p>
                                                        )}
                                                        {item.sku && (
                                                            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                                                SKU: {item.sku}
                                                            </span>
                                                        )}
                                                        {/* Flag de Banco Frio */}
                                                        {isBancoFrio && (
                                                            <div className="mt-1 inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                                                                <span>❄️</span>
                                                                <span>Banco Frio</span>
                                                                {dataFrio && (
                                                                    <span className="text-blue-500">
                                                                        • {new Date(dataFrio).toLocaleDateString('pt-BR')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="col-span-1 text-center">
                                                        <span className="text-gray-700 font-medium text-sm">
                                                            {ncm}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-2 text-center">
                                                        <span className="text-gray-900 font-medium">
                                                            {item.quantidade || item.quantity || 0}
                                                        </span>
                                                        {item.unidadeMedida && (
                                                            <span className="text-xs text-gray-500 ml-1">
                                                                {item.unidadeMedida}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="col-span-2 text-right text-gray-900 font-semibold">
                                                        R$ {(() => {
                                                            // Usar valorVenda do material se disponível, senão usar precoUnit do orçamento
                                                            const valorVenda = item.material?.valorVenda;
                                                            const precoVenda = valorVenda || item.precoUnit || item.valorUnitario || item.precoUnitario || item.preco || item.custoUnit || 0;
                                                            return precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                                        })()}
                                                    </div>
                                                    <div className="col-span-3 text-right">
                                                        <span className="font-bold text-green-700 text-lg">
                                                            R$ {(() => {
                                                                // Usar valorVenda do material se disponível, senão usar precoUnit do orçamento
                                                                const valorVenda = item.material?.valorVenda;
                                                                const precoVenda = valorVenda || item.precoUnit || item.valorUnitario || item.precoUnitario || item.preco || item.custoUnit || 0;
                                                                const quantidade = item.quantidade || item.quantity || 0;
                                                                const subtotal = item.subtotal || (quantidade * precoVenda);
                                                                return subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>

                                        {/* Footer com Total */}
                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-300 px-6 py-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold text-gray-700">TOTAL DOS ITENS:</span>
                                                <span className="text-2xl font-bold text-green-700">
                                                    R$ {calculosFinanceiros.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Inputs de Pagamento */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Forma de Pagamento *
                                    </label>
                                    <select
                                        value={vendaForm.formaPagamento}
                                        onChange={(e) => setVendaForm({...vendaForm, formaPagamento: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    >
                                        {formasPagamento.map(forma => (
                                            <option key={forma} value={forma}>{forma}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Número de Parcelas *
                                    </label>
                                    <input
                                        type="number"
                                        value={vendaForm.parcelas}
                                        onChange={(e) => setVendaForm({...vendaForm, parcelas: Number(e.target.value)})}
                                        min="1"
                                        max="36"
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Valor de Entrada (R$)
                                    </label>
                                    <input
                                        type="number"
                                        value={vendaForm.valorEntrada}
                                        onChange={(e) => setVendaForm({...vendaForm, valorEntrada: Number(e.target.value)})}
                                        min="0"
                                        max={calculosFinanceiros.valorTotal}
                                        step="0.01"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        placeholder="0,00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Data da Primeira Parcela *
                                    </label>
                                    <input
                                        type="date"
                                        value={vendaForm.dataPrimeiraParcela}
                                        onChange={(e) => setVendaForm({...vendaForm, dataPrimeiraParcela: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                </div>
                            </div>

                            {/* Cálculos Automáticos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                                    <h4 className="text-xs font-semibold text-blue-700 uppercase mb-1">Valor Financiado</h4>
                                    <p className="text-2xl font-bold text-blue-900">
                                        R$ {calculosFinanceiros.valorFinanciado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Total - Entrada = Valor a parcelar
                                    </p>
                                </div>

                                <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
                                    <h4 className="text-xs font-semibold text-purple-700 uppercase mb-1">Valor da Parcela</h4>
                                    <p className="text-2xl font-bold text-purple-900">
                                        R$ {calculosFinanceiros.valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        {vendaForm.parcelas}x de R$ {calculosFinanceiros.valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SEÇÃO 4: Documentos Vinculados */}
                {orcamentoSelecionado && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600">📄</span>
                            Documentos do Projeto
                        </h3>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                                    <DocumentTextIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-gray-700">Projeto Elétrico</p>
                                    <p className="text-xs text-gray-500 mt-1">Disponível no orçamento</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                                    <DocumentTextIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-gray-700">ART/RRT</p>
                                    <p className="text-xs text-gray-500 mt-1">A ser gerado</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                                    <DocumentTextIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-gray-700">Laudos</p>
                                    <p className="text-xs text-gray-500 mt-1">A ser anexado</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                                    <DocumentTextIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-gray-700">Contrato</p>
                                    <p className="text-xs text-gray-500 mt-1">A ser gerado</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SEÇÃO 5: Observações e Controles */}
                {orcamentoSelecionado && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">📝</span>
                            Observações e Controles
                        </h3>
                        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Observações Comerciais
                            </label>
                            <textarea
                                value={vendaForm.observacoesComerciais}
                                onChange={(e) => setVendaForm({...vendaForm, observacoesComerciais: e.target.value})}
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Informações adicionais sobre a negociação, descontos aplicados, etc..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Condições Especiais de Pagamento
                            </label>
                            <textarea
                                value={vendaForm.condicoesEspeciaisPagamento}
                                onChange={(e) => setVendaForm({...vendaForm, condicoesEspeciaisPagamento: e.target.value})}
                                rows={2}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Ex: Pagamento mediante conclusão de etapas, bonificações, etc..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Observações Gerais
                            </label>
                            <textarea
                                value={vendaForm.observacoes}
                                onChange={(e) => setVendaForm({...vendaForm, observacoes: e.target.value})}
                                rows={2}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Outras informações relevantes sobre a venda..."
                            />
                        </div>
                        </div>
                    </div>
                )}

                {/* Botões de Ação */}
                <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200">
                    <button
                        type="button"
                        onClick={() => setActiveTab('dashboard')}
                        className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || !orcamentoSelecionado}
                        className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processando...
                            </>
                        ) : (
                            <>
                                <CreditCardIcon className="w-5 h-5" />
                                Registrar Venda e Criar Projeto
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );

    const renderListaVendas = () => (
        <div className="space-y-6">
            {/* Filtros */}
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por cliente ou projeto..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                    </div>
                    <div>
                        <select className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500">
                            <option value="">Todos os Status</option>
                            <option value="concluida">Concluída</option>
                            <option value="andamento">Em Andamento</option>
                            <option value="cancelada">Cancelada</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Lista de Vendas */}
            {vendas.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-16 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <DocumentTextIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma venda encontrada</h3>
                    <p className="text-gray-500 mb-6">Comece criando uma nova venda a partir de um orçamento aprovado.</p>
                    <button
                        onClick={() => setActiveTab('nova')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Nova Venda
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {vendas.map((venda, index) => (
                        <div key={venda.id} className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium hover:border-green-300 transition-all">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                                <div>
                                    <h4 className="font-semibold text-gray-900">{venda.cliente?.nome || 'Cliente'}</h4>
                                    <p className="text-sm text-gray-600">{venda.orcamento?.titulo || 'Projeto'}</p>
                                    <p className="text-xs text-gray-500 mt-1">Nº {index + 1}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Valor Total</p>
                                    <p className="text-lg font-bold text-green-600">
                                        R$ {(venda.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Pago: R$ {(venda.valorPago || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Data</p>
                                    <p className="text-sm text-gray-900">{new Date(venda.dataVenda).toLocaleDateString('pt-BR')}</p>
                                    <p className="text-xs text-gray-500">{venda.formaPagamento}</p>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                                        venda.status === 'Finalizada' 
                                            ? 'bg-green-100 text-green-800 ring-1 ring-green-200' 
                                            : venda.status === 'Ativa'
                                            ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-200'
                                            : 'bg-red-100 text-red-800 ring-1 ring-red-200'
                                    }`}>
                                        {venda.status === 'Finalizada' && '✅ '}
                                        {venda.status === 'Ativa' && '⏳ '}
                                        {venda.status === 'Cancelada' && '❌ '}
                                        {venda.status}
                                    </span>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => abrirModalVisualizarVendaCompleto(venda)}
                                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all font-semibold flex items-center gap-2"
                                        title="Visualizar detalhes da venda"
                                    >
                                        <EyeIcon className="w-5 h-5" />
                                        Visualizar
                                    </button>
                                    {canDelete(user) && (
                                        <button
                                            onClick={() => {
                                                setVendaToDelete(venda);
                                                setShowDeleteDialog(true);
                                            }}
                                            className="px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all font-semibold flex items-center gap-2"
                                            title="Excluir venda (apenas Desenvolvedor/Administrador)"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                            Excluir
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // Renderizar página de configurações
    const renderConfig = () => (
        <div className="space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-soft border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <span className="text-2xl">⚙️</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Configurações de Vendas</h2>
                        <p className="text-gray-600">Defina metas e parâmetros para o módulo de vendas</p>
                    </div>
                </div>

                {/* Configuração de Meta Mensal */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">🎯</span>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Meta Mensal de Vendas</h3>
                            <p className="text-sm text-gray-600">Defina o objetivo de faturamento mensal da equipe</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Valor da Meta (R$)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                                    R$
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={metaMensal}
                                    onChange={(e) => setMetaMensal(parseFloat(e.target.value) || 0)}
                                    className="w-full pl-12 pr-4 py-4 text-2xl font-bold border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-gray-600">Meta Atual:</p>
                                    <p className="text-3xl font-bold text-blue-600">
                                        R$ {metaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">Faturado no Mês:</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        R$ {estatisticasVendas.totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-sm font-semibold text-gray-700 mt-1">
                                        {estatisticasVendas.percentualMeta.toFixed(1)}% da meta
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className={`h-3 rounded-full transition-all ${
                                            estatisticasVendas.percentualMeta >= 100 ? 'bg-green-500' : 'bg-blue-500'
                                        }`}
                                        style={{ width: `${Math.min(estatisticasVendas.percentualMeta, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setMetaMensal(100000);
                                    toast.success('Meta resetada para R$ 100.000,00');
                                }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold"
                            >
                                Resetar para R$ 100.000
                            </button>
                            <button
                                onClick={() => {
                                    toast.success('Meta salva com sucesso!', {
                                        description: `Nova meta: R$ ${metaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                    });
                                }}
                                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 font-semibold"
                            >
                                💾 Salvar Configurações
                            </button>
                        </div>
                    </div>
                </div>

                {/* Informações sobre permissões */}
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                    <div className="flex items-start gap-3">
                        <span className="text-yellow-600 text-xl">⚠️</span>
                        <div>
                            <p className="font-semibold text-yellow-900">Apenas Administradores e Gerentes</p>
                            <p className="text-sm text-yellow-800 mt-1">
                                Somente usuários com perfil de Administrador ou Gerente podem alterar as metas mensais.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Renderizar página de ajuda (Como funcionam as métricas)
    const renderAjuda = () => (
        <div className="space-y-6">
            <div className="card-primary p-8 rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <span className="text-2xl">📚</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Como Funcionam as Métricas de Vendas</h2>
                        <p className="text-gray-600 dark:text-dark-text-secondary">Entenda cada indicador e como são calculados</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Total em Vendas */}
                    <div className="border-l-4 border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20 p-6 rounded-r-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                                <CurrencyDollarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold text-green-900 dark:text-green-300">💰 Total em Vendas</h3>
                        </div>
                        <p className="text-gray-700 dark:text-dark-text mb-3">
                            <strong className="dark:text-green-300">O que é:</strong> Soma de TODOS os valores de vendas realizadas no mês atual.
                        </p>
                        <p className="text-gray-700 dark:text-dark-text mb-3">
                            <strong className="dark:text-green-300">Como é calculado:</strong>
                        </p>
                        <div className="card-secondary p-4 rounded-lg border border-green-200 dark:border-green-800 font-mono text-sm">
                            <code className="text-gray-900 dark:text-dark-text">Total = Venda₁ + Venda₂ + Venda₃ + ... + Vendaₙ</code>
                        </div>
                        <p className="text-gray-700 dark:text-dark-text mt-3">
                            <strong className="dark:text-green-300">Exemplo:</strong> Se você fez 3 vendas de R$ 5.000, R$ 3.200 e R$ 1.800, o total será R$ 10.000.
                        </p>
                        <div className="mt-4 bg-green-100 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-sm text-green-800 dark:text-green-300">
                                ✅ <strong>Atualização:</strong> Essa métrica atualiza automaticamente em tempo real sempre que uma nova venda é registrada!
                            </p>
                        </div>
                    </div>

                    {/* Vendas no Mês */}
                    <div className="border-l-4 border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-r-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                <ChartBarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-300">📊 Vendas no Mês</h3>
                        </div>
                        <p className="text-gray-700 dark:text-dark-text mb-3">
                            <strong className="dark:text-blue-300">O que é:</strong> Quantidade total de vendas fechadas no mês atual.
                        </p>
                        <p className="text-gray-700 dark:text-dark-text mb-3">
                            <strong className="dark:text-blue-300">Como é calculado:</strong>
                        </p>
                        <div className="card-secondary p-4 rounded-lg border border-blue-200 dark:border-blue-800 font-mono text-sm">
                            <code className="text-gray-900 dark:text-dark-text">Vendas no Mês = Contagem de todas as vendas registradas</code>
                        </div>
                        <p className="text-gray-700 dark:text-dark-text mt-3">
                            <strong className="dark:text-blue-300">Exemplo:</strong> Se você registrou 15 vendas este mês, o valor será 15.
                        </p>
                    </div>

                    {/* Ticket Médio */}
                    <div className="border-l-4 border-purple-500 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20 p-6 rounded-r-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                                <DocumentTextIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold text-purple-900 dark:text-purple-300">🎫 Ticket Médio</h3>
                        </div>
                        <p className="text-gray-700 dark:text-dark-text mb-3">
                            <strong className="dark:text-purple-300">O que é:</strong> Valor médio de cada venda realizada no mês.
                        </p>
                        <p className="text-gray-700 dark:text-dark-text mb-3">
                            <strong className="dark:text-purple-300">Como é calculado:</strong>
                        </p>
                        <div className="card-secondary p-4 rounded-lg border border-purple-200 dark:border-purple-800 font-mono text-sm">
                            <code className="text-gray-900 dark:text-dark-text">Ticket Médio = Total em Vendas ÷ Vendas no Mês</code>
                        </div>
                        <p className="text-gray-700 dark:text-dark-text mt-3">
                            <strong className="dark:text-purple-300">Exemplo:</strong> Se você faturou R$ 10.000 em 5 vendas, o ticket médio é R$ 2.000.
                        </p>
                        <div className="mt-4 bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                            <p className="text-sm text-purple-800 dark:text-purple-300">
                                💡 <strong>Dica:</strong> Um ticket médio alto indica vendas de maior valor. Use isso para estratégias comerciais!
                            </p>
                        </div>
                    </div>

                    {/* Meta do Mês */}
                    <div className="border-l-4 border-orange-500 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20 p-6 rounded-r-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                                <span className="text-2xl">🎯</span>
                            </div>
                            <h3 className="text-xl font-bold text-orange-900 dark:text-orange-300">🎯 Meta do Mês</h3>
                        </div>
                        <p className="text-gray-700 dark:text-dark-text mb-3">
                            <strong className="dark:text-orange-300">O que é:</strong> Objetivo de faturamento definido para o mês atual.
                        </p>
                        <p className="text-gray-700 dark:text-dark-text mb-3">
                            <strong className="dark:text-orange-300">Como é definida:</strong>
                        </p>
                        <div className="card-secondary p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                            <p className="text-gray-700 dark:text-dark-text">
                                A meta é configurada manualmente por Administradores ou Gerentes na aba <strong className="dark:text-orange-300">"⚙️ Configurações"</strong>.
                                O valor padrão é R$ 100.000,00, mas pode ser ajustado conforme a estratégia da empresa.
                            </p>
                        </div>
                        <p className="text-gray-700 dark:text-dark-text mt-3">
                            <strong className="dark:text-orange-300">Progresso:</strong>
                        </p>
                        <div className="card-secondary p-4 rounded-lg border border-orange-200 dark:border-orange-800 font-mono text-sm">
                            <code className="text-gray-900 dark:text-dark-text">Percentual = (Total em Vendas ÷ Meta do Mês) × 100%</code>
                        </div>
                        <div className="mt-4 bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                            <p className="text-sm text-orange-800 dark:text-orange-300">
                                🔥 <strong>Meta Alcançada:</strong> Quando você atingir 100% da meta, a barra de progresso ficará verde!
                            </p>
                        </div>
                    </div>

                    {/* Resumo Rápido */}
                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-2 border-gray-200 dark:border-dark-border p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-4">📋 Resumo das Fórmulas</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 card-primary p-3 rounded-lg border border-gray-200 dark:border-dark-border">
                                <span className="text-green-600 dark:text-green-400 font-bold min-w-[160px]">Total em Vendas:</span>
                                <code className="text-sm text-gray-700 dark:text-dark-text">Σ (valor de cada venda)</code>
                            </div>
                            <div className="flex items-center gap-3 card-primary p-3 rounded-lg border border-gray-200 dark:border-dark-border">
                                <span className="text-blue-600 dark:text-blue-400 font-bold min-w-[160px]">Vendas no Mês:</span>
                                <code className="text-sm text-gray-700 dark:text-dark-text">COUNT(vendas)</code>
                            </div>
                            <div className="flex items-center gap-3 card-primary p-3 rounded-lg border border-gray-200 dark:border-dark-border">
                                <span className="text-purple-600 dark:text-purple-400 font-bold min-w-[160px]">Ticket Médio:</span>
                                <code className="text-sm text-gray-700 dark:text-dark-text">Total ÷ Vendas no Mês</code>
                            </div>
                            <div className="flex items-center gap-3 card-primary p-3 rounded-lg border border-gray-200 dark:border-dark-border">
                                <span className="text-orange-600 dark:text-orange-400 font-bold min-w-[160px]">Progresso da Meta:</span>
                                <code className="text-sm text-gray-700 dark:text-dark-text">(Total ÷ Meta) × 100%</code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen p-4 sm:p-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 rounded-xl hover:bg-white hover:shadow-soft">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">Vendas</h1>
                        <p className="text-sm sm:text-base text-gray-500 mt-1">Gerencie suas vendas e faturamento</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <ActionsDropdown
                        actions={[
                            {
                                label: loading ? 'Carregando...' : 'Atualizar',
                                onClick: loadData,
                                icon: (
                                    <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                ),
                                disabled: loading,
                                variant: 'info'
                            },
                            {
                                label: 'Template',
                                onClick: handleExportTemplate,
                                icon: <DocumentArrowDownIcon className="w-4 h-4" />,
                                variant: 'primary'
                            },
                            {
                                label: 'Exportar',
                                onClick: handleExportData,
                                icon: <DocumentArrowDownIcon className="w-4 h-4" />,
                                disabled: vendas.length === 0,
                                variant: 'info'
                            },
                            {
                                label: importing ? 'Importando...' : 'Importar',
                                onClick: handleImportClick,
                                icon: <DocumentArrowUpIcon className="w-4 h-4" />,
                                disabled: importing,
                                variant: 'success'
                            }
                        ]}
                        label="Ações"
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImportFile}
                        style={{ display: 'none' }}
                    />
                    <button
                        onClick={() => setActiveTab('nova')}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Nova Venda
                    </button>
                </div>
            </header>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <p className="text-red-800 font-medium">⚠️ {error}</p>
                        <button 
                            onClick={loadData}
                            className="text-red-700 hover:text-red-900 font-medium underline"
                        >
                            Tentar novamente
                        </button>
                    </div>
                </div>
            )}

            {/* Tabs de Navegação */}
            <div className="flex flex-wrap gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                        activeTab === 'dashboard'
                            ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-medium'
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300 hover:bg-green-50'
                    }`}
                >
                    📊 Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('nova')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                        activeTab === 'nova'
                            ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-medium'
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300 hover:bg-green-50'
                    }`}
                >
                    ➕ Nova Venda
                </button>
                <button
                    onClick={() => setActiveTab('lista')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                        activeTab === 'lista'
                            ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-medium'
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300 hover:bg-green-50'
                    }`}
                >
                    📋 Lista de Vendas
                </button>
                {(user?.role === 'admin' || user?.role === 'gerente') && (
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                            activeTab === 'config'
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-medium'
                                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                    >
                        ⚙️ Configurações
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('ajuda')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                        activeTab === 'ajuda'
                            ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-medium'
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                >
                    ❓ Como Funcionam as Métricas
                </button>
            </div>

            {/* Conteúdo das Abas */}
            <div className="animate-fade-in">
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'nova' && renderNovaVenda()}
                {activeTab === 'lista' && renderListaVendas()}
                {activeTab === 'config' && renderConfig()}
                {activeTab === 'ajuda' && renderAjuda()}
            </div>

            {/* Modal de Visualização de Venda */}
            {modalVisualizarVenda && vendaParaVisualizar && (
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
                                onClick={() => {
                                    setModalVisualizarVenda(false);
                                    setVendaParaVisualizar(null);
                                    setDetalhesVenda(null);
                                }}
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
                                                #{vendas.findIndex(v => v.id === detalhesVenda.id) + 1}
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
                                                            // Usar valorVenda do material se disponível, senão usar precoUnit do orçamento
                                                            const valorVenda = item.material?.valorVenda;
                                                            const precoUnit = valorVenda || item.precoUnit || item.precoUnitario || (item.subtotal / (item.quantidade || 1)) || 0;
                                                            const valorTotal = item.subtotal || (quantidade * precoUnit);
                                                            // Obter NCM: prioridade para cotação, depois material
                                                            const ncm = item.cotacao?.ncm || item.material?.ncm || '-';
                                                            return (
                                                                <tr key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                                        {item.material?.nome || item.servico?.nome || item.kit?.nome || item.descricao || 'Item sem nome'}
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
                                onClick={() => {
                                    setModalVisualizarVenda(false);
                                    setVendaParaVisualizar(null);
                                    setDetalhesVenda(null);
                                }}
                                className="px-6 py-3 bg-white dark:bg-gray-600 border-2 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-500 transition-all font-semibold"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Preview de Importação */}
            {modalPreviewImportOpen && dadosParaImportar && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-emerald-600 to-emerald-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                        <DocumentArrowUpIcon className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">Preview de Importação</h3>
                                        <p className="text-sm text-emerald-100 mt-1">
                                            {dadosParaImportar.vendas.length} venda(s) para importar
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setModalPreviewImportOpen(false);
                                        setDadosParaImportar(null);
                                    }}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Resumo */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">📊 Resumo da Importação</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-blue-700 dark:text-blue-400">Total:</p>
                                        <p className="text-lg font-bold text-blue-900 dark:text-blue-300">
                                            {dadosParaImportar.vendas.length}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-green-700 dark:text-green-400">Válidas:</p>
                                        <p className="text-lg font-bold text-green-900 dark:text-green-300">
                                            {dadosParaImportar.vendas.filter(v => !v.errosVenda || v.errosVenda.length === 0).length}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-red-700 dark:text-red-400">Com Erros:</p>
                                        <p className="text-lg font-bold text-red-900 dark:text-red-300">
                                            {dadosParaImportar.vendas.filter(v => v.errosVenda && v.errosVenda.length > 0).length}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Lista de Vendas */}
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-dark-text mb-3">📋 Vendas para Importar</h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100 dark:bg-gray-800">
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                    Orçamento
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                    Cliente
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                    Forma Pagamento
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                    Parcelas
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                    Valor Total
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dadosParaImportar.vendas.map((venda, index) => {
                                                const temErros = venda.errosVenda && venda.errosVenda.length > 0;
                                                return (
                                                    <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${temErros ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                            {venda.orcamentoNumero ? `Orçamento ${venda.orcamentoNumero}` : 'Sem número'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                            {venda.clienteNome || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                            {venda.formaPagamento || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                            {venda.numeroParcelas || 1}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                            R$ {(venda.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm border border-gray-300 dark:border-gray-600">
                                                            {temErros ? (
                                                                <div className="text-red-600 dark:text-red-400">
                                                                    <p className="font-semibold">❌ Erros</p>
                                                                    <ul className="text-xs mt-1">
                                                                        {venda.errosVenda.map((erro, i) => (
                                                                            <li key={i}>• {erro}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            ) : (
                                                                <span className="text-green-600 dark:text-green-400 font-semibold">✅ Válida</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Avisos */}
                            {dadosParaImportar.erros.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                                    <h4 className="font-semibold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2">
                                        ⚠️ Avisos
                                    </h4>
                                    <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300 max-h-32 overflow-y-auto">
                                        {dadosParaImportar.erros.map((erro, index) => (
                                            <li key={index}>• {erro}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-end gap-3 rounded-b-2xl">
                            <button
                                onClick={() => {
                                    setModalPreviewImportOpen(false);
                                    setDadosParaImportar(null);
                                }}
                                disabled={importing}
                                className="px-6 py-3 bg-white dark:bg-gray-600 border-2 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-500 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmarImportacao}
                                disabled={importing || dadosParaImportar.vendas.filter(v => !v.errosVenda || v.errosVenda.length === 0).length === 0}
                                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-600 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {importing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Importando...
                                    </>
                                ) : (
                                    <>
                                        ✅ Confirmar Importação
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AlertDialog de Confirmação de Venda */}
            <AlertDialog
                isOpen={confirmVendaOpen}
                onClose={() => setConfirmVendaOpen(false)}
                onConfirm={async () => {
                    await handleSubmitVenda();
                    setConfirmVendaOpen(false);
                }}
                title="Validou os dados do orçamento? Confirmar venda?"
                message="Esta venda será registrada com base no orçamento selecionado e nas condições financeiras definidas. Confirme se todos os dados estão corretos antes de prosseguir."
                confirmText="Confirmar Venda"
                cancelText="Cancelar"
                variant="info"
            />

            {/* AlertDialog de Confirmação de Exclusão */}
            <AlertDialog
                isOpen={showDeleteDialog}
                onClose={() => {
                    setShowDeleteDialog(false);
                    setVendaToDelete(null);
                }}
                onConfirm={handleDeleteVenda}
                title={`Excluir venda do cliente "${vendaToDelete?.cliente?.nome || 'N/A'}"?`}
                message={`Tem certeza que deseja excluir permanentemente esta venda? Esta ação não pode ser desfeita.`}
                confirmText="Excluir Permanentemente"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
};

export default Vendas;