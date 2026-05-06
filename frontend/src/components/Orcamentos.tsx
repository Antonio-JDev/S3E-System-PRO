import React, { useState, useEffect, useMemo, useContext } from 'react';
import { toast } from 'sonner';
import { useLocation, useNavigate } from 'react-router-dom';
import { orcamentosService, type Orcamento as ApiOrcamento, type CreateOrcamentoData } from '../services/orcamentosService';
import { clientesService, type Cliente } from '../services/clientesService';
import { empresasService, type Empresa } from '../services/empresasService';
import { empresaFiscalService, type EmpresaFiscal } from '../services/empresaFiscalService';
import { axiosApiService } from '../services/axiosApi';
import ViewToggle from './ui/ViewToggle';
import { ENDPOINTS } from '../config/api';
import { loadViewMode, saveViewMode } from '../utils/viewModeStorage';
import AlertDialog from './ui/AlertDialog';
import ActionsDropdown from './ui/ActionsDropdown';
import { AuthContext } from '../contexts/AuthContext';
import { canDelete } from '../utils/permissions';

import { useEscapeKey } from '../hooks/useEscapeKey';
import {
    generateEmptyTemplate,
    generateExampleTemplate,
    exportToJSON,
    readJSONFile,
    validateImportData,
    type OrcamentoTemplate,
    type ImportExportData,
} from '../utils/importExportTemplates';
import TechnicalEditor from './TechnicalEditor';
import { generateOrcamentoPDF, type OrcamentoPDFData as OrcamentoPDFDataOld } from '../utils/pdfGenerator';
import NovoOrcamentoPage from '../pages/NovoOrcamentoPage';
import PDFCustomizationModal from './PDFCustomization/PDFCustomizationModalWrapper';
import { OrcamentoPDFData } from '../types/pdfCustomization';
import { identificarTipoMaterial, TipoMaterial, podeVenderEmMetroOuCm, formatarUnidadeOrcamento } from '../utils/unitConverter';
import { mapItensOrcamentoParaCopia } from '../utils/orcamentoCopy';
import { matchCrossSearch } from '../utils/searchUtils';
import { roundMoney } from '../utils/currency';
import { calcularValorAReceberDoOrcamento, calcularValorVendaDiretaDoOrcamento } from '../utils/orcamentoValorAReceber';
import ModalItensKit from './ModalItensKit';

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
const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);
const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const ArrowsUpDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
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

type OrcamentosAbaNav = 'listagem' | 'novo' | 'expirados' | 'declinados';

/** Borda esquerda no primeiro <td> (tabelas collapse — mesma abordagem da página Compras). Na aba Expirados sem barra. */
function getOrcamentoRowLateralBorderClass(status: string, abaAtiva: OrcamentosAbaNav): string {
    if (abaAtiva === 'expirados') return '';
    if (abaAtiva === 'declinados') {
        return 'border-l-4 border-gray-900 dark:border-neutral-950';
    }
    switch (status) {
        case 'Pendente':
            return 'border-l-4 border-yellow-400';
        case 'Enviado ao Cliente':
            return 'border-l-4 border-blue-600';
        case 'Aprovado':
            return 'border-l-4 border-green-600';
        case 'Recusado':
        case 'Declinado':
        case 'Cancelado':
            return 'border-l-4 border-gray-900 dark:border-neutral-950';
        default:
            return 'border-l-4 border-gray-300 dark:border-gray-600';
    }
}

/** Faixa lateral nos cards (grade). Na aba Expirados não exibe cor. */
function getOrcamentoCardStripeClass(status: string, abaAtiva: OrcamentosAbaNav): string {
    if (abaAtiva === 'expirados') return '';
    if (abaAtiva === 'declinados') {
        return 'bg-gray-900 dark:bg-neutral-950';
    }
    switch (status) {
        case 'Pendente':
            return 'bg-yellow-400';
        case 'Enviado ao Cliente':
            return 'bg-blue-600';
        case 'Aprovado':
            return 'bg-green-600';
        case 'Recusado':
        case 'Declinado':
        case 'Cancelado':
            return 'bg-gray-900 dark:bg-neutral-950';
        default:
            return 'bg-gray-300 dark:bg-gray-600';
    }
}

// Types (usar tipo Cliente do service importado)

interface Material {
    id: string;
    nome: string;
    sku: string;
    unidadeMedida: string;
    preco: number;
    valorVenda?: number; // Preço de venda (usado em orçamentos)
    porcentagemLucro?: number; // Porcentagem de lucro
    estoque: number;
    categoria: string;
    ativo: boolean;
    fornecedor?: {
        id: string;
        nome: string;
    };
}

interface OrcamentoItem {
    id?: string;
    tipo: 'MATERIAL' | 'KIT' | 'SERVICO' | 'QUADRO_PRONTO' | 'CUSTO_EXTRA' | 'COTACAO';
    materialId?: string;
    kitId?: string;
    quadroId?: string;
    cotacaoId?: string; // Novo
    servicoId?: string;
    servicoNome?: string;
    descricao?: string;
    dataAtualizacaoCotacao?: string; // Novo
    nome: string;
    unidadeMedida: string; // Unidade de estoque
    unidadeVenda?: string; // Unidade de venda (pode ser diferente, ex: cm para barramentos)
    tipoMaterial?: 'BARRAMENTO_COBRE' | 'TRILHO_DIN' | 'CABO' | 'PADRAO'; // Tipo especial para conversão
    ncm?: string; // Nomenclatura Comum do Mercosul (para faturamento NF-e/NFS-e)
    quantidade: number;
    custoUnit: number;
    precoBase?: number; // Base do preço de venda (valorVenda || preco)
    precoUnit: number;
    subtotal: number;
    orcamentoId?: string;
    // Relações carregadas do backend
    material?: { id: string; nome: string; sku?: string; unidadeMedida?: string; ncm?: string };
    kit?: { id: string; nome: string };
    cotacao?: { id: string; nome: string; dataAtualizacao?: string; fornecedorNome?: string; ncm?: string };
}

interface Foto {
    id?: string;
    url: string;
    legenda: string;
    ordem: number;
    preview?: string;
}

// Usar o tipo do service
type Orcamento = ApiOrcamento;

interface OrcamentosProps {
    toggleSidebar: () => void;
    initialBudgetId?: string | null;
    onClearInitialBudgetId?: () => void;
}

interface OrcamentosPropsExtended extends OrcamentosProps {
    suppressSuspenseSpinner?: boolean;
}

const Orcamentos: React.FC<OrcamentosPropsExtended> = ({ toggleSidebar, initialBudgetId, onClearInitialBudgetId, suppressSuspenseSpinner }) => {
    const { user } = useContext(AuthContext)!;
    const navigate = useNavigate();
    const location = useLocation();

    // Estado de Navegação por Abas
    const [abaAtiva, setAbaAtiva] = useState<'listagem' | 'novo' | 'expirados' | 'declinados'>('listagem');
    // Dados do lead (Funil de Atendimento) para preencher Novo Orçamento
    const [initialDataFromLead, setInitialDataFromLead] = useState<{
      nome?: string;
      cpfCnpj?: string;
      observacoes?: string;
      logradouro?: string;
      numero?: string;
      bairro?: string;
      cep?: string;
      cidade?: string;
      estado?: string;
      clienteId?: string;
      contatoLeadId?: string;
    } | null>(null);

    const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [materiais, setMateriais] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState<string>('Todos');
    const [sortAprovadosPorDataAprovacao, setSortAprovadosPorDataAprovacao] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(loadViewMode('Orcamentos'));

    // Salvar viewMode no localStorage quando mudar
    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        saveViewMode('Orcamentos', mode);
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [shouldLoadEditor, setShouldLoadEditor] = useState(false);
    const [orcamentoToEdit, setOrcamentoToEdit] = useState<Orcamento | null>(null);
    const [orcamentoToView, setOrcamentoToView] = useState<Orcamento | null>(null);

    // Estado para modal de visualização de itens do kit
    const [showModalItensKit, setShowModalItensKit] = useState(false);
    const [itensKitParaVisualizar, setItensKitParaVisualizar] = useState<any[]>([]);
    const [nomeKitParaVisualizar, setNomeKitParaVisualizar] = useState<string>('');

    // Função auxiliar para formatar o tipo do item
    const formatarTipoItem = (tipo: string): string => {
        const tipos: { [key: string]: string } = {
            'MATERIAL': 'Material',
            'SERVICO': 'Serviço',
            'COTACAO': 'Banco Frio',
            'QUADRO_PRONTO': 'Quadro',
            'CUSTO_EXTRA': 'Custo Extra',
            'KIT': 'Kit'
        };
        return tipos[tipo] || tipo;
    };

    // Função auxiliar para retornar itens do kit (BDI removido)
    const aplicarBdiAosItensKit = (itensKit: any[]): any[] => {
        return itensKit;
    };

    // Estado para AlertDialog de aprovação
    const [showAprovarDialog, setShowAprovarDialog] = useState(false);
    const [orcamentoToAprovar, setOrcamentoToAprovar] = useState<Orcamento | null>(null);

    // Estado para PDF Customization
    const [showPDFCustomization, setShowPDFCustomization] = useState(false);
    const [orcamentoForPDF, setOrcamentoForPDF] = useState<Orcamento | null>(null);

    // Modal Atualizar dados cliente (CPF/CNPJ e endereço de cobrança para NF)
    const [showModalAtualizarCliente, setShowModalAtualizarCliente] = useState(false);
    const [clienteParaAtualizar, setClienteParaAtualizar] = useState<Cliente | null>(null);
    const [formClienteAtualizar, setFormClienteAtualizar] = useState<{ nome: string; cpfCnpj: string; endereco: string; cidade: string; estado: string; cep: string; telefone: string; email: string }>({ nome: '', cpfCnpj: '', endereco: '', cidade: '', estado: '', cep: '', telefone: '', email: '' });
    const [salvandoCliente, setSalvandoCliente] = useState(false);

    // Estados para importação/exportação
    const [importing, setImporting] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Estados para modal de preview de importação
    const [modalPreviewImportOpen, setModalPreviewImportOpen] = useState(false);
    const [dadosParaImportar, setDadosParaImportar] = useState<{
        orcamentos: any[];
        erros: string[];
    } | null>(null);

    // Form state
    const [formState, setFormState] = useState({
        clienteId: '',
        titulo: '',
        descricao: '',
        descricaoProjeto: '',
        validade: '',
        bdi: 0,
        observacoes: '',
        // Novos campos (empresa executora: Orçamento → PV → NF-e/NFS-e)
        empresaCNPJ: '',
        empresaFiscalId: '',
        enderecoObra: '',
        cidade: '',
        bairro: '',
        cep: '',
        responsavelObra: '',
        previsaoInicio: '',
        previsaoTermino: '',
        descontoValor: 0,
        impostoPercentual: 0,
        condicaoPagamento: 'À Vista'
    });

    const [items, setItems] = useState<OrcamentoItem[]>([]);
    const [showItemModal, setShowItemModal] = useState(false);

    // Estados para quantidades dos itens selecionados
    const [quantidadesMateriais, setQuantidadesMateriais] = useState<Map<string, number>>(new Map());
    const [quantidadesServicos, setQuantidadesServicos] = useState<Map<string, number>>(new Map());
    const [quantidadesKits, setQuantidadesKits] = useState<Map<string, number>>(new Map());
    const [quantidadesQuadros, setQuantidadesQuadros] = useState<Map<string, number>>(new Map());
    const [quantidadesCotacoes, setQuantidadesCotacoes] = useState<Map<string, number>>(new Map());
    const [itemSearchTerm, setItemSearchTerm] = useState('');
    const [tipoItemSelecionado, setTipoItemSelecionado] = useState<'material' | 'kit' | 'servico' | 'quadro' | 'cotacao' | 'extra'>('material');
    const [cotacoes, setCotacoes] = useState<any[]>([]);
    const [kits, setKits] = useState<any[]>([]);
    const [servicos, setServicos] = useState<any[]>([]);
    const [quadrosProntos, setQuadrosProntos] = useState<any[]>([]);

    // Estados para modal de comparação (estoque vs banco frio)
    const [modalExpandido, setModalExpandido] = useState(false);
    const [materiaisComEstoque, setMateriaisComEstoque] = useState<Material[]>([]);
    const [cotacoesBancoFrio, setCotacoesBancoFrio] = useState<any[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [empresasFiscais, setEmpresasFiscais] = useState<EmpresaFiscal[]>([]);
    const [searchEstoque, setSearchEstoque] = useState('');
    const [searchCotacoes, setSearchCotacoes] = useState('');
    const [searchGlobalComparacao, setSearchGlobalComparacao] = useState('');
    const [materialSelecionadoComparacao, setMaterialSelecionadoComparacao] = useState<Material | null>(null);
    const [cotacaoSelecionadaComparacao, setCotacaoSelecionadaComparacao] = useState<any | null>(null);
    const [materiaisSelecionadosComparacao, setMateriaisSelecionadosComparacao] = useState<Set<string>>(new Set());
    const [cotacoesSelecionadasComparacao, setCotacoesSelecionadasComparacao] = useState<Set<string>>(new Set());

    // Estado para busca global e modo de adição
    const [buscaGlobal, setBuscaGlobal] = useState('');
    const [modoAdicao, setModoAdicao] = useState<'materiais' | 'servicos' | 'kits' | 'quadros' | 'cotacoes' | 'manual' | 'comparacao'>('materiais');
    const [resultadosBuscaGlobal, setResultadosBuscaGlobal] = useState<{
        materiais: Material[];
        servicos: any[];
        kits: any[];
        quadros: any[];
        cotacoes: any[];
    }>({
        materiais: [],
        servicos: [],
        kits: [],
        quadros: [],
        cotacoes: []
    });
    const [novoItemManual, setNovoItemManual] = useState({
        nome: '',
        descricao: '',
        unidadeMedida: 'UN',
        quantidade: 1,
        custoUnit: 0,
        tipo: 'MATERIAL' as const
    });

    // Funções helper para trabalhar com itens de orçamento
    const getItemTipo = (item: any) => String(item?.tipo || '').toUpperCase();

    const getItemNome = (item: any): string => {
        const tipo = getItemTipo(item);
        if ((tipo === 'COTACAO' || tipo === 'BANCO_FRIO') && (item.cotacao?.nome || item.nome)) {
            return item.cotacao?.nome || item.nome;
        }
        if (tipo === 'MATERIAL' && (item.material?.nome || item.materialNome)) {
            return item.material?.nome || item.materialNome;
        }
        // ✅ Para kits: priorizar item.descricao (nome customizado salvo) se for kit customizado, senão usar item.kit?.nome (kit cadastrado)
        if (tipo === 'KIT') {
            // Se for kit customizado (sem kitId), usar item.descricao que contém o nome do usuário
            if (!item.kitId && item.descricao) {
                return item.descricao;
            }
            // Se for kit cadastrado, usar item.kit?.nome
            if (item.kit?.nome) {
                return item.kit.nome;
            }
            // Fallback: usar item.descricao ou item.nome se existir
            if (item.descricao) {
                return item.descricao;
            }
            if (item.nome) {
                return item.nome;
            }
        }
        if (tipo === 'SERVICO') {
            return item.servicoNome || item.descricao || 'Serviço';
        }
        return item.nome || item.descricao || item.material?.nome || item.cotacao?.nome || 'Item sem nome';
    };

    const getItemDataAtualizacaoCotacao = (item: any): string | null => {
        const tipo = getItemTipo(item);
        if (tipo === 'COTACAO' || tipo === 'BANCO_FRIO' || item.cotacaoId || item.cotacao) {
            // Priorizar dataAtualizacaoCotacao preservada, depois tentar outras fontes
            return (
                item.dataAtualizacaoCotacao || // ✅ Dados preservados do mapeamento
                item.cotacao?.dataAtualizacao ||
                item.cotacao?.updatedAt ||
                item.dataImportacao ||
                item.cotacao?.createdAt ||
                null
            );
        }
        return null;
    };

    const isItemBancoFrio = (item: any): boolean => {
        const tipo = getItemTipo(item);
        return tipo === 'COTACAO' || tipo === 'BANCO_FRIO' || !!item.cotacaoId || !!item.cotacao;
    };

    const shouldShowDescricao = (item: any): boolean => {
        const tipo = getItemTipo(item);
        if (tipo === 'COTACAO' || tipo === 'BANCO_FRIO') {
            return false;
        }
        const nome = getItemNome(item);
        return !!item.descricao && item.descricao !== nome;
    };

    // Carregar dados iniciais usando os serviços adequados
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('🔍 Carregando dados de orçamentos via serviços...');

            const [orcamentosRes, clientesRes, materiaisRes, cotacoesRes, kitsRes, servicosRes, empresasRes, empresasFiscaisRes] = await Promise.all([
                orcamentosService.listar(),
                clientesService.listar(),
                axiosApiService.get<Material[]>(ENDPOINTS.MATERIAIS),
                axiosApiService.get('/api/cotacoes'),
                axiosApiService.get(ENDPOINTS.KITS),
                axiosApiService.get(ENDPOINTS.SERVICOS),
                empresasService.listar({ ativo: true }),
                empresaFiscalService.listar()
            ]);

            console.log('📊 Resposta do serviço - Orçamentos:', orcamentosRes);
            console.log('👥 Resposta do serviço - Clientes:', clientesRes);
            console.log('📦 Resposta da API - Materiais:', materiaisRes);

            // Tratar orçamentos usando o serviço
            if (orcamentosRes.success && orcamentosRes.data) {
                const orcamentosData = Array.isArray(orcamentosRes.data) ? orcamentosRes.data : [];
                setOrcamentos(orcamentosData);
                console.log(`✅ ${orcamentosData.length} orçamentos carregados`);
            } else {
                console.warn('⚠️ Erro ao carregar orçamentos:', orcamentosRes.error);
                setOrcamentos([]);
            }

            // Tratar clientes usando o serviço
            if (clientesRes.success && clientesRes.data) {
                const clientesData = Array.isArray(clientesRes.data) ? clientesRes.data : [];
                setClientes(clientesData);
                console.log(`✅ ${clientesData.length} clientes carregados`);
            } else {
                console.warn('⚠️ Erro ao carregar clientes:', clientesRes.error);
                setClientes([]);
            }

            // Tratar materiais
            if (materiaisRes.success && materiaisRes.data) {
                const materiaisData = Array.isArray(materiaisRes.data) ? materiaisRes.data : [];
                setMateriais(materiaisData);
                console.log(`✅ ${materiaisData.length} materiais carregados`);
            } else {
                console.warn('⚠️ Erro ao carregar materiais:', materiaisRes.error);
                setMateriais([]);
            }

            // Tratar cotações
            if (cotacoesRes.success && cotacoesRes.data) {
                const cotacoesData = Array.isArray(cotacoesRes.data) ? cotacoesRes.data : [];
                setCotacoes(cotacoesData);
                console.log(`✅ ${cotacoesData.length} cotações carregadas`);
            } else {
                console.warn('⚠️ Erro ao carregar cotações:', cotacoesRes.error);
                setCotacoes([]);
            }

            // Tratar kits
            if (kitsRes.success && kitsRes.data) {
                const kitsData = Array.isArray(kitsRes.data) ? kitsRes.data : [];
                setKits(kitsData);
                console.log(`✅ ${kitsData.length} kits carregados`);
            } else {
                console.warn('⚠️ Erro ao carregar kits:', kitsRes.error);
                setKits([]);
            }

            // Tratar serviços
            if (servicosRes.success && servicosRes.data) {
                const servicosData = Array.isArray(servicosRes.data) ? servicosRes.data : [];
                setServicos(servicosData);
                console.log(`✅ ${servicosData.length} serviços carregados`);
            } else {
                console.warn('⚠️ Erro ao carregar serviços:', servicosRes.error);
                setServicos([]);
            }

            // Tratar empresas (CNPJs da S3E)
            if (empresasRes.success && empresasRes.data) {
                const empresasData = Array.isArray(empresasRes.data) ? empresasRes.data : [];
                setEmpresas(empresasData);
                console.log(`✅ ${empresasData.length} empresas carregadas`);
            } else {
                console.warn('⚠️ Erro ao carregar empresas:', empresasRes.error);
                setEmpresas([]);
            }

            // Tratar empresas fiscais (empresa executora: Orçamento → PV → NF-e/NFS-e)
            if (empresasFiscaisRes?.data) {
                const list = Array.isArray(empresasFiscaisRes.data) ? empresasFiscaisRes.data : [];
                setEmpresasFiscais(list);
                console.log(`✅ ${list.length} empresas fiscais carregadas`);
            } else {
                setEmpresasFiscais([]);
            }

        } catch (err) {
            console.error('❌ Erro crítico ao carregar dados:', err);
            setError('Erro de conexão ao carregar dados');
            setOrcamentos([]);
            setClientes([]);
            setMateriais([]);
            setCotacoes([]);
            setKits([]);
            setServicos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Ao montar: se veio do Funil de Atendimento com "Gerar Orçamento", abrir aba novo e passar dados
    useEffect(() => {
        // 1) Via query params (novo fluxo)
        try {
            const sp = new URLSearchParams(location.search || '');
            const clienteId = (sp.get('clienteId') || '').trim();
            const leadId = (sp.get('leadId') || '').trim();
            if (clienteId || leadId) {
                setInitialDataFromLead({
                    clienteId: clienteId || undefined,
                    contatoLeadId: leadId || undefined,
                });
                setAbaAtiva('novo');
                // limpar query params para não reabrir caso o usuário navegue por abas internamente
                navigate('/orcamentos', { replace: true });
                return;
            }
        } catch (_) {
            // ignore
        }

        // 2) Via localStorage (compatibilidade)
        try {
            const raw = localStorage.getItem('s3e_lead_para_orcamento');
            if (!raw) return;
            const data = JSON.parse(raw) as {
              nome?: string;
              cpfCnpj?: string;
              observacoes?: string;
              logradouro?: string;
              numero?: string;
              bairro?: string;
              cep?: string;
              cidade?: string;
              estado?: string;
              clienteId?: string;
              contatoLeadId?: string;
            };
            localStorage.removeItem('s3e_lead_para_orcamento');
            setInitialDataFromLead(data);
            setAbaAtiva('novo');
        } catch (_) {
            localStorage.removeItem('s3e_lead_para_orcamento');
        }
    }, [location.search, navigate]);

    // Abrir modal do orçamento quando vier pelo link rápido (ordem de serviço)
    useEffect(() => {
        if (!initialBudgetId || !onClearInitialBudgetId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await axiosApiService.get<any>(`/api/orcamentos/${initialBudgetId}`);
                if (cancelled) return;
                if (res.success && res.data) {
                    setOrcamentoToView(res.data);
                }
            } catch (e) {
                if (!cancelled) toast.error('Orçamento não encontrado');
            } finally {
                if (!cancelled) onClearInitialBudgetId();
            }
        })();
        return () => { cancelled = true; };
    }, [initialBudgetId, onClearInitialBudgetId]);

    // Fechar modal de visualização com tecla ESC
    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && orcamentoToView) {
                setOrcamentoToView(null);
            }
        };

        // Adicionar listener apenas se o modal estiver aberto
        if (orcamentoToView) {
            document.addEventListener('keydown', handleEscapeKey);
        }

        // Limpar listener quando o componente desmontar ou modal fechar
        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [orcamentoToView]);

    // Expandir modal automaticamente quando houver texto na busca global
    useEffect(() => {
        if (showItemModal && buscaGlobal.trim()) {
            setModalExpandido(true);
        } else if (showItemModal && !buscaGlobal.trim()) {
            setModalExpandido(false);
        }
    }, [buscaGlobal, showItemModal]);

    // Filtrar materiais para seleção
    const filteredMaterials = useMemo(() => {
        if (!Array.isArray(materiais)) return [];

        return materiais
            .filter(material => material.ativo)
            .filter(material =>
                matchCrossSearch(itemSearchTerm, material.nome) ||
                material.sku.toLowerCase().includes(itemSearchTerm.toLowerCase())
            );
    }, [materiais, itemSearchTerm]);

    // Filtrar cotações para seleção
    const filteredCotacoes = useMemo(() => {
        if (!Array.isArray(cotacoes)) return [];

        return cotacoes
            .filter(cotacao => cotacao.ativo)
            .filter(cotacao =>
                matchCrossSearch(itemSearchTerm, cotacao.nome) ||
                cotacao.ncm?.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
                cotacao.fornecedorNome?.toLowerCase().includes(itemSearchTerm.toLowerCase())
            );
    }, [cotacoes, itemSearchTerm]);

    // Filtrar kits para seleção
    const filteredKits = useMemo(() => {
        if (!Array.isArray(kits)) return [];

        return kits
            .filter(kit => kit.ativo)
            .filter(kit =>
                matchCrossSearch(itemSearchTerm, kit.nome) ||
                kit.descricao?.toLowerCase().includes(itemSearchTerm.toLowerCase())
            );
    }, [kits, itemSearchTerm]);

    // Filtrar serviços para seleção
    const filteredServicos = useMemo(() => {
        if (!Array.isArray(servicos)) return [];

        return servicos
            .filter(servico => servico.ativo)
            .filter(servico =>
                matchCrossSearch(itemSearchTerm, servico.nome) ||
                servico.descricao?.toLowerCase().includes(itemSearchTerm.toLowerCase())
            );
    }, [servicos, itemSearchTerm]);

    // Filtrar quadros prontos para seleção (será implementado quando houver backend)
    const filteredQuadrosProntos = useMemo(() => {
        if (!Array.isArray(quadrosProntos)) return [];

        return quadrosProntos
            .filter(quadro => quadro.ativo)
            .filter(quadro =>
                quadro.nome.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
                quadro.descricao?.toLowerCase().includes(itemSearchTerm.toLowerCase())
            );
    }, [quadrosProntos, itemSearchTerm]);

    // Alias para compatibilidade com modal de comparação
    const filteredQuadros = filteredQuadrosProntos;

    // Popular materiais com estoque e cotações do banco frio para comparação
    useEffect(() => {
            if (Array.isArray(materiais)) {
            setMateriaisComEstoque(materiais.filter(m => m.ativo));
        }
        if (Array.isArray(cotacoes)) {
            setCotacoesBancoFrio(cotacoes.filter(c => c.ativo !== false));
        }
    }, [materiais, cotacoes]);

    // Filtrar materiais com estoque para comparação
    const filteredMateriaisEstoque = useMemo(() => {
        const termoBusca = searchGlobalComparacao || searchEstoque;
        if (!termoBusca) return materiaisComEstoque || [];
        return (materiaisComEstoque || []).filter(material =>
            material && (
                (material.nome || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
                (material.sku || '').toLowerCase().includes(termoBusca.toLowerCase())
            )
        );
    }, [materiaisComEstoque, searchEstoque, searchGlobalComparacao]);

    // Filtrar cotações para comparação
    const filteredCotacoesComparacao = useMemo(() => {
        const termoBusca = searchGlobalComparacao || searchCotacoes;
        if (!termoBusca) return cotacoesBancoFrio || [];
        return (cotacoesBancoFrio || []).filter(cotacao =>
            cotacao && (
                matchCrossSearch(termoBusca, cotacao.nome || '') ||
                (cotacao.ncm || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
                (cotacao.fornecedorNome || '').toLowerCase().includes(termoBusca.toLowerCase())
            )
        );
    }, [cotacoesBancoFrio, searchCotacoes, searchGlobalComparacao]);

    // Busca global em todos os tipos de itens
    useEffect(() => {
        if (!buscaGlobal.trim()) {
            setResultadosBuscaGlobal({
                materiais: [],
                servicos: [],
                kits: [],
                quadros: [],
                cotacoes: []
            });
            return;
        }

        const termo = buscaGlobal.toLowerCase();

        const materiaisEncontrados = (materiais || [])
            .filter(m => m && m.ativo)
            .filter(m =>
                (m.nome || '').toLowerCase().includes(termo) ||
                (m.sku || '').toLowerCase().includes(termo)
            );

        const servicosEncontrados = (servicos || [])
            .filter(s => s && s.ativo)
            .filter(s =>
                (s.nome || '').toLowerCase().includes(termo) ||
                (s.codigo || '').toLowerCase().includes(termo) ||
                (s.descricao || '').toLowerCase().includes(termo)
            );

        const kitsEncontrados = (kits || [])
            .filter(k => k && k.ativo)
            .filter(k =>
                (k.nome || '').toLowerCase().includes(termo) ||
                (k.descricao || '').toLowerCase().includes(termo)
            );

        const quadrosEncontrados = (quadrosProntos || [])
            .filter(q => q && q.ativo)
            .filter(q =>
                (q.nome || '').toLowerCase().includes(termo) ||
                (q.descricao || '').toLowerCase().includes(termo)
            );

        const cotacoesEncontradas = (cotacoes || [])
            .filter(c => c && c.ativo !== false)
            .filter(c =>
                (c.nome || '').toLowerCase().includes(termo) ||
                (c.ncm || '').toLowerCase().includes(termo) ||
                (c.fornecedorNome || '').toLowerCase().includes(termo)
            );

        setResultadosBuscaGlobal({
            materiais: materiaisEncontrados,
            servicos: servicosEncontrados,
            kits: kitsEncontrados,
            quadros: quadrosEncontrados,
            cotacoes: cotacoesEncontradas
        });
    }, [buscaGlobal, materiais, servicos, kits, quadrosProntos, cotacoes]);

    // Filtrar orçamentos
    // Função para verificar se um orçamento está expirado
    const isOrcamentoExpirado = (orcamento: Orcamento): boolean => {
        if (!orcamento.validade) return false;
        if (orcamento.status === 'Aprovado') return false; // Orçamentos aprovados não expiram

        const dataValidade = new Date(orcamento.validade);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        dataValidade.setHours(0, 0, 0, 0);

        return dataValidade < hoje;
    };

    // Apenas orçamentos expirados (validade vencida, não aprovados).
    // Declinado/Recusado/Cancelado vão somente para a aba Declinados — a validade não os coloca em Expirados.
    const orcamentosExpirados = useMemo(() => {
        if (!Array.isArray(orcamentos)) return [];
        return orcamentos
            .filter(orc => orc.status !== 'Recusado' && orc.status !== 'Declinado' && orc.status !== 'Cancelado')
            .filter(orc => isOrcamentoExpirado(orc))
            .filter(orc => {
                const term = searchTerm.toLowerCase();
                const clienteNome = (orc.cliente?.nome || '').toLowerCase();
                const titulo = (orc.titulo || '').toLowerCase();
                const numeroSeq = orc.numeroSequencial !== undefined && orc.numeroSequencial !== null ? String(orc.numeroSequencial) : (orc.numero !== undefined && orc.numero !== null ? String(orc.numero) : '');
                return titulo.includes(term) || clienteNome.includes(term) || numeroSeq.includes(term) || (orc.id || '').toLowerCase().includes(term);
            })
            .sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
    }, [orcamentos, searchTerm]);

    // Apenas orçamentos declinados (Recusado, Declinado, Cancelado)
    const orcamentosDeclinados = useMemo(() => {
        if (!Array.isArray(orcamentos)) return [];
        return orcamentos
            .filter(orc => orc.status === 'Recusado' || orc.status === 'Declinado' || orc.status === 'Cancelado')
            .filter(orc => {
                const term = searchTerm.toLowerCase();
                const clienteNome = (orc.cliente?.nome || '').toLowerCase();
                const titulo = (orc.titulo || '').toLowerCase();
                const numeroSeq = orc.numeroSequencial !== undefined && orc.numeroSequencial !== null ? String(orc.numeroSequencial) : (orc.numero !== undefined && orc.numero !== null ? String(orc.numero) : '');
                return titulo.includes(term) || clienteNome.includes(term) || numeroSeq.includes(term) || (orc.id || '').toLowerCase().includes(term);
            })
            .sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
    }, [orcamentos, searchTerm]);

    const filteredOrcamentos = useMemo(() => {
        if (!Array.isArray(orcamentos)) return [];

        if (abaAtiva === 'expirados') return orcamentosExpirados;
        if (abaAtiva === 'declinados') return orcamentosDeclinados;

        // Filtro normal para aba de listagem
        return orcamentos
            .filter(orc => {
                // Na listagem principal, excluir reprovados, declinados, cancelados e expirados
                if (orc.status === 'Recusado') return false;
                if (orc.status === 'Declinado') return false;
                if (orc.status === 'Cancelado') return false;
                if (isOrcamentoExpirado(orc)) return false;
                // Aplicar filtro de status
                return statusFilter === 'Todos' || orc.status === statusFilter;
            })
            .filter(orc => {
                const term = searchTerm.toLowerCase();
                const clienteNome = (orc.cliente?.nome || '').toLowerCase();
                const titulo = (orc.titulo || '').toLowerCase();
                const numeroSeq = orc.numeroSequencial !== undefined && orc.numeroSequencial !== null ? String(orc.numeroSequencial) : (orc.numero !== undefined && orc.numero !== null ? String(orc.numero) : '');
                return titulo.includes(term) || clienteNome.includes(term) || numeroSeq.includes(term) || (orc.id || '').toLowerCase().includes(term);
            })
            .sort((a, b) => {
                // Quando filtro é Aprovado e ordenação por data de aprovação está ativa: mais recentemente aprovados primeiro
                if (statusFilter === 'Aprovado' && sortAprovadosPorDataAprovacao) {
                    const dateA = a.aprovedAt ? new Date(a.aprovedAt).getTime() : 0;
                    const dateB = b.aprovedAt ? new Date(b.aprovedAt).getTime() : 0;
                    return dateB - dateA; // Mais recente primeiro (sem data vai para o fim)
                }
                // Ordenar por data de criação (mais recente primeiro)
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA; // Mais recente primeiro
            });
    }, [orcamentos, statusFilter, searchTerm, abaAtiva, orcamentosExpirados, orcamentosDeclinados, sortAprovadosPorDataAprovacao]);

    // Calcular totais do orçamento (NOVA LÓGICA)
    const calculosOrcamento = useMemo(() => {
        const subtotalItens = items.reduce((sum, item) => sum + item.subtotal, 0);
        const valorComDesconto = subtotalItens - formState.descontoValor;
        const valorTotalFinal = valorComDesconto * (1 + formState.impostoPercentual / 100);

        return {
            subtotalItens,
            valorComDesconto,
            valorTotalFinal
        };
    }, [items, formState.descontoValor, formState.impostoPercentual]);

    const calculateTotal = () => {
        return calculosOrcamento.valorTotalFinal;
    };

    // Abrir modal ou navegar para página de edição
    const handleOpenModal = (orcamento: Orcamento | null = null) => {
        // Se for edição, navegar para página de edição
        if (orcamento) {
            navigate(`/orcamentos/editar/${orcamento.id}`);
            return;
        }

        // Se for criação, abrir modal
        // Reset editor loading state
        setShouldLoadEditor(false);

        // Limpar dados para novo orçamento
        setOrcamentoToEdit(null);
        setFormState({
            clienteId: '',
            titulo: '',
            descricao: '',
            descricaoProjeto: '',
            validade: '',
            bdi: 0,
            observacoes: '',
            empresaCNPJ: '',
            empresaFiscalId: '',
            enderecoObra: '',
            cidade: '',
            bairro: '',
            cep: '',
            responsavelObra: '',
            previsaoInicio: '',
            previsaoTermino: '',
            descontoValor: 0,
            impostoPercentual: 0,
            condicaoPagamento: 'À Vista'
        });
        setItems([]);

        // Abrir modal IMEDIATAMENTE (sem esperar)
        setIsModalOpen(true);

        // Carregar editor Jodit DEPOIS de 300ms (dar tempo pro modal renderizar)
        setTimeout(() => {
            setShouldLoadEditor(true);
        }, 300);
    };

    // Fechar modal
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setShowItemModal(false);
        setShouldLoadEditor(false);
        setOrcamentoToEdit(null);
        setFormState({
            clienteId: '',
            titulo: '',
            descricao: '',
            descricaoProjeto: '',
            validade: '',
            bdi: 0,
            observacoes: '',
            empresaCNPJ: '',
            empresaFiscalId: '',
            enderecoObra: '',
            cidade: '',
            bairro: '',
            cep: '',
            responsavelObra: '',
            previsaoInicio: '',
            previsaoTermino: '',
            descontoValor: 0,
            impostoPercentual: 0,
            condicaoPagamento: 'À Vista'
        });
        setItems([]);
    };


    // Fechar modais com ESC
    useEscapeKey(isModalOpen, handleCloseModal);
    useEscapeKey(showItemModal, () => setShowItemModal(false));
    useEscapeKey(showPDFCustomization, () => setShowPDFCustomization(false));

    // Funções de Exportação/Importação
    const handleExportTemplate = () => {
        try {
            const template = generateExampleTemplate('orcamentos');
            exportToJSON(template, `template_orcamentos_${new Date().toISOString().split('T')[0]}.json`);
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
                orcamentos: orcamentos.map(orc => ({
                    clienteId: orc.clienteId,
                    clienteNome: orc.cliente?.nome,
                    titulo: orc.titulo,
                    descricao: orc.descricao,
                    descricaoProjeto: orc.descricaoProjeto,
                    validade: orc.validade ?? orc.createdAt ?? new Date().toISOString().split('T')[0],
                    status: orc.status,
                    bdi: orc.bdi,
                    observacoes: orc.observacoes,
                    empresaCNPJ: orc.empresaCNPJ,
                    enderecoObra: orc.enderecoObra,
                    cidade: orc.cidade,
                    bairro: orc.bairro,
                    cep: orc.cep,
                    responsavelObra: orc.responsavelObra,
                    previsaoInicio: orc.previsaoInicio,
                    previsaoTermino: orc.previsaoTermino,
                    descontoValor: orc.descontoValor,
                    impostoPercentual: orc.impostoPercentual,
                    condicaoPagamento: orc.condicaoPagamento,
                    items: (orc.items || []).map(item => ({
                        tipo: (item.tipo || 'MATERIAL') as 'MATERIAL' | 'KIT' | 'SERVICO' | 'QUADRO_PRONTO' | 'CUSTO_EXTRA' | 'COTACAO',
                        materialId: item.materialId,
                        materialNome: item.nome,
                        nome: getItemNome(item) as string,
                        descricao: item.descricao,
                        unidadeMedida: item.unidadeMedida || 'UN',
                        quantidade: item.quantidade,
                        custoUnit: item.custoUnit,
                        precoUnit: item.precoUnit ?? item.valorUnitario,
                        subtotal: item.subtotal ?? item.valorTotal,
                    })),
                })),
            };
            exportToJSON(template, `orcamentos_export_${new Date().toISOString().split('T')[0]}.json`);
            toast.success(`✅ ${orcamentos.length} orçamento(s) exportado(s) com sucesso!`);
        } catch (error) {
            console.error('Erro ao exportar orçamentos:', error);
            toast.error('❌ Erro ao exportar orçamentos');
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

            if (!data.orcamentos || data.orcamentos.length === 0) {
                toast.error('❌ O arquivo não contém orçamentos para importar');
                return;
            }

            // Preparar dados para preview
            const orcamentosPreview: any[] = [];
            const erros: string[] = [];

            // Validar cada orçamento antes de mostrar no preview
            for (const orcTemplate of data.orcamentos) {
                const errosOrcamento: string[] = [];

                // Buscar cliente por nome se não tiver ID
                let clienteId = orcTemplate.clienteId;
                let clienteNome = orcTemplate.clienteNome || '';
                if (!clienteId && orcTemplate.clienteNome) {
                    const cliente = clientes.find(c => c.nome.toLowerCase() === orcTemplate.clienteNome?.toLowerCase());
                    if (cliente) {
                        clienteId = cliente.id;
                        clienteNome = cliente.nome;
                    } else {
                        errosOrcamento.push(`Cliente ${orcTemplate.clienteNome} não encontrado`);
                    }
                }

                if (!clienteId) {
                    errosOrcamento.push('Cliente não informado ou inválido');
                }

                // Validar itens
                const items = (orcTemplate.items || []).map((item: any) => {
                    let materialId = item.materialId;
                    if (!materialId && item.materialNome) {
                        const material = materiais.find(m => m.nome.toLowerCase() === item.materialNome?.toLowerCase());
                        if (material) materialId = material.id;
                    }

                    return {
                        tipo: item.tipo,
                        materialId,
                        nome: item.nome,
                        descricao: item.descricao,
                        unidadeMedida: item.unidadeMedida,
                        quantidade: item.quantidade,
                        precoUnitario: item.precoUnit || item.custoUnit || 0,
                        subtotal: item.subtotal || (item.quantidade * (item.precoUnit || item.custoUnit || 0)),
                    };
                });

                orcamentosPreview.push({
                    ...orcTemplate,
                    clienteId,
                    clienteNome,
                    items,
                    errosOrcamento,
                });

                if (errosOrcamento.length > 0) {
                    erros.push(`Orçamento ${orcTemplate.titulo || 'sem título'}: ${errosOrcamento.join(', ')}`);
                }
            }

            // Mostrar preview
            setDadosParaImportar({
                orcamentos: orcamentosPreview,
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

            // Importar apenas orçamentos válidos (sem erros)
            for (const orcTemplate of dadosParaImportar.orcamentos) {
                if (orcTemplate.errosOrcamento && orcTemplate.errosOrcamento.length > 0) {
                    errorCount++;
                    continue;
                }

                try {
                    const createData: CreateOrcamentoData = {
                        clienteId: orcTemplate.clienteId,
                        titulo: orcTemplate.titulo,
                        descricao: orcTemplate.descricao,
                        validade: orcTemplate.validade,
                        bdi: 0,
                        observacoes: orcTemplate.observacoes,
                        items: orcTemplate.items,
                    };

                    const response = await orcamentosService.criar(createData);
                    if (response.success) {
                        successCount++;
                    } else {
                        errorCount++;
                        console.error('Erro ao criar orçamento:', response.error);
                    }
                } catch (error) {
                    errorCount++;
                    console.error('Erro ao importar orçamento:', error);
                }
            }

            setModalPreviewImportOpen(false);
            setDadosParaImportar(null);

            toast.success(`✅ Importação concluída! ${successCount} orçamento(s) importado(s), ${errorCount} erro(s)`);
            await loadData(); // Recarregar lista
        } catch (error) {
            console.error('Erro ao confirmar importação:', error);
            toast.error('❌ Erro ao confirmar importação');
        } finally {
            setImporting(false);
        }
    };

    // Adicionar item ao orçamento
    // Funções auxiliares para atualizar quantidades
    const atualizarQuantidadeMaterial = (materialId: string, quantidade: number) => {
        setQuantidadesMateriais(prev => {
            const novo = new Map(prev);
            if (quantidade > 0) {
                novo.set(materialId, quantidade);
            } else {
                novo.delete(materialId);
            }
            return novo;
        });
    };

    const atualizarQuantidadeServico = (servicoId: string, quantidade: number) => {
        setQuantidadesServicos(prev => {
            const novo = new Map(prev);
            if (quantidade > 0) {
                novo.set(servicoId, quantidade);
            } else {
                novo.delete(servicoId);
            }
            return novo;
        });
    };

    const atualizarQuantidadeKit = (kitId: string, quantidade: number) => {
        setQuantidadesKits(prev => {
            const novo = new Map(prev);
            if (quantidade > 0) {
                novo.set(kitId, quantidade);
            } else {
                novo.delete(kitId);
            }
            return novo;
        });
    };

    const atualizarQuantidadeQuadro = (quadroId: string, quantidade: number) => {
        setQuantidadesQuadros(prev => {
            const novo = new Map(prev);
            if (quantidade > 0) {
                novo.set(quadroId, quantidade);
            } else {
                novo.delete(quadroId);
            }
            return novo;
        });
    };

    const atualizarQuantidadeCotacao = (cotacaoId: string, quantidade: number) => {
        setQuantidadesCotacoes(prev => {
            const novo = new Map(prev);
            if (quantidade > 0) {
                novo.set(cotacaoId, quantidade);
            } else {
                novo.delete(cotacaoId);
            }
            return novo;
        });
    };

    const handleAddItem = (material: Material, manterModalAberto = false, quantidade?: number) => {
        const qtd = quantidade || quantidadesMateriais.get(material.id) || 1;

        // Usar valorVenda se disponível, senão usar preco (preço de compra)
        const precoVenda = material.valorVenda || material.preco;
        const precoBase = precoVenda; // Preço base

        const newItem: OrcamentoItem = {
            tipo: 'MATERIAL',
            materialId: material.id,
            nome: material.nome,
            descricao: material.nome, // Usar o nome como descrição
            unidadeMedida: material.unidadeMedida,
            quantidade: qtd,
            custoUnit: material.preco, // Custo sempre é o preço de compra
            precoBase: precoBase, // Preço base
            precoUnit: precoBase,
            subtotal: precoBase * qtd
        };

        setItems(prev => [...prev, newItem]);

        // Limpar quantidade após adicionar
        atualizarQuantidadeMaterial(material.id, 0);

        if (!manterModalAberto) {
            setShowItemModal(false);
        }
        setItemSearchTerm('');
        toast.success(`Material adicionado ao orçamento (${qtd}x)`);
    };

    // Adicionar cotação ao orçamento (BANCO FRIO)
    const handleAddCotacao = (cotacao: any, manterModalAberto = false, unidadeVenda?: string, quantidade?: number) => {
        const qtd = quantidade || quantidadesCotacoes.get(cotacao.id) || 1;
        const unidadeVendaFinal = unidadeVenda || cotacao.unidadeMedida || 'UN';

        // Calcular custo baseado na unidade de venda
        let custoUnitario = cotacao.valorUnitario || 0;
        // Se a unidade de medida da cotação permitir venda em M/cm e estiver vendendo em cm, ajustar o preço
        if (podeVenderEmMetroOuCm(cotacao.unidadeMedida) && unidadeVendaFinal === 'cm') {
            // Se vender em cm, dividir o preço por metro por 100
            custoUnitario = cotacao.valorUnitario / 100;
        }
        custoUnitario = roundMoney(custoUnitario);

        // Calcular preço de venda: usar valorVenda se disponível, senão usar custo unitário
        const valorVendaBase = cotacao.valorVenda || custoUnitario;
        const precoBase = roundMoney(valorVendaBase); // Preço base (2 decimais)

        // Identificar tipo de material baseado no nome da cotação
        const tipoMaterial = identificarTipoMaterial(cotacao.nome);

        const newItem: OrcamentoItem = {
            tipo: 'COTACAO',
            cotacaoId: cotacao.id,
            nome: cotacao.nome,
            descricao: cotacao.nome, // ✅ Apenas o nome do material (não mostrar fornecedor)
            dataAtualizacaoCotacao: cotacao.dataAtualizacao,
            unidadeMedida: unidadeVendaFinal,
            unidadeVenda: unidadeVendaFinal, // Unidade de venda
            tipoMaterial: tipoMaterial,
            quantidade: qtd,
            custoUnit: custoUnitario, // Custo é sempre o valor da cotação (valorUnitario)
            precoBase: precoBase, // Preço base
            precoUnit: precoBase,
            subtotal: roundMoney(precoBase * qtd)
        };

        setItems(prev => [...prev, newItem]);

        // Limpar quantidade após adicionar
        atualizarQuantidadeCotacao(cotacao.id, 0);

        if (!manterModalAberto) {
            setShowItemModal(false);
        }
        setItemSearchTerm('');

        // Verificar se a cotação tem mais de 30 dias
        if (cotacao.dataAtualizacao) {
            const dataAtualizacao = new Date(cotacao.dataAtualizacao);
            const diasDesdeAtualizacao = Math.floor((new Date().getTime() - dataAtualizacao.getTime()) / (1000 * 60 * 60 * 24));

            if (diasDesdeAtualizacao > 30) {
                toast.warning(`⚠️ Cotação antiga: ${diasDesdeAtualizacao} dias desde a última atualização`, {
                    description: `A cotação "${cotacao.nome}" foi atualizada há mais de 30 dias. Considere realizar uma nova cotação.`,
                    duration: 5000
                });
            } else {
                toast.success(`Cotação adicionada do banco frio (${qtd}x)`);
            }
        } else {
            toast.success(`Cotação adicionada do banco frio (${qtd}x)`);
        }
    };

    // Funções para modal de comparação
    const toggleMaterialSelecionado = (materialId: string) => {
        setMateriaisSelecionadosComparacao(prev => {
            const novo = new Set(prev);
            if (novo.has(materialId)) {
                novo.delete(materialId);
            } else {
                novo.add(materialId);
            }
            return novo;
        });
    };

    const toggleCotacaoSelecionada = (cotacaoId: string) => {
        setCotacoesSelecionadasComparacao(prev => {
            const novo = new Set(prev);
            if (novo.has(cotacaoId)) {
                novo.delete(cotacaoId);
            } else {
                novo.add(cotacaoId);
            }
            return novo;
        });
    };

    const handleAddItemComValidacao = (material?: Material, cotacao?: any, quantidade?: number, unidadeVenda?: string) => {
        const qtd = quantidade || 1;

        // Validar estoque se for material
        if (material) {
            if (material.estoque < qtd) {
                toast.warning('Estoque insuficiente', {
                    description: `Estoque disponível: ${material.estoque} ${material.unidadeMedida}. Solicitado: ${qtd} ${material.unidadeMedida}`
                });
                // Não bloquear a adição; apenas avisar
            }

            const unidadeVendaFinal = unidadeVenda || material.unidadeMedida;

            // Determinar preço de venda baseado na unidade
            let precoVenda = material.preco || 0;

            // Se a unidade de medida permitir venda em M/cm, usar valores específicos
            if (podeVenderEmMetroOuCm(material.unidadeMedida)) {
                if (unidadeVendaFinal === 'm') {
                    precoVenda = (material as any).valorVendaM || material.valorVenda || material.preco || 0;
                } else if (unidadeVendaFinal === 'cm') {
                    precoVenda = (material as any).valorVendaCM ||
                        ((material as any).valorVendaM ? (material as any).valorVendaM / 100 :
                            (material.valorVenda ? material.valorVenda / 100 : (material.preco || 0) / 100));
                }
            } else {
                precoVenda = material.valorVenda || material.preco || 0;
            }

            const precoBase = precoVenda;

            const newItem: OrcamentoItem = {
                tipo: 'MATERIAL',
                materialId: material.id,
                nome: material.nome,
                descricao: material.nome,
                unidadeMedida: material.unidadeMedida, // Unidade de estoque
                unidadeVenda: unidadeVendaFinal, // Unidade de venda (pode ser diferente)
                quantidade: qtd,
                custoUnit: material.preco,
                precoBase: precoBase,
                precoUnit: precoBase,
                subtotal: precoBase * qtd
            };

            setItems(prev => [...prev, newItem]);
            toast.success('Material adicionado', {
                description: `${material.nome} (${qtd} ${unidadeVendaFinal}) - Estoque: ${material.estoque} ${material.unidadeMedida}`
            });
        }

        // Adicionar cotação se fornecida
        if (cotacao) {
            const valorVenda = cotacao.valorVenda || cotacao.valorUnitario * 1.4;
            const precoBase = valorVenda;

            const newItem: OrcamentoItem = {
                tipo: 'COTACAO',
                cotacaoId: cotacao.id,
                nome: cotacao.nome,
                descricao: cotacao.nome,
                unidadeMedida: cotacao.unidadeMedida || 'UN',
                quantidade: qtd,
                custoUnit: cotacao.valorUnitario || 0,
                precoBase: precoBase,
                precoUnit: precoBase,
                subtotal: precoBase * qtd,
                dataAtualizacaoCotacao: cotacao.dataAtualizacao
            };

            setItems(prev => [...prev, newItem]);
            toast.success('Cotação adicionada', {
                description: `${cotacao.nome} do banco frio - Fornecedor: ${cotacao.fornecedorNome || 'N/A'}`
            });
        }

        // Limpar seleções
        setMaterialSelecionadoComparacao(null);
        setCotacaoSelecionadaComparacao(null);
        setMateriaisSelecionadosComparacao(new Set());
        setCotacoesSelecionadasComparacao(new Set());
    };

    const handleInserirSelecionados = () => {
        let inseridos = 0;

        // Inserir materiais selecionados
        materiaisSelecionadosComparacao.forEach(materialId => {
            const material = materiaisComEstoque.find(m => m.id === materialId);
            if (material) {
                const qtd = quantidadesMateriais.get(materialId) || 1;
                handleAddItemComValidacao(material, undefined, qtd);
                inseridos++;
            }
        });

        // Inserir cotações selecionadas
        cotacoesSelecionadasComparacao.forEach(cotacaoId => {
            const cotacao = cotacoesBancoFrio.find(c => c.id === cotacaoId);
            if (cotacao) {
                const qtd = quantidadesCotacoes.get(cotacaoId) || 1;
                handleAddItemComValidacao(undefined, cotacao, qtd);
                inseridos++;
            }
        });

        if (inseridos > 0) {
            toast.success(`${inseridos} item(ns) inserido(s) com sucesso!`);
            // Limpar seleções e quantidades
            setMateriaisSelecionadosComparacao(new Set());
            setCotacoesSelecionadasComparacao(new Set());
            setQuantidadesMateriais(new Map());
            setQuantidadesCotacoes(new Map());
        }
    };

    // Função para inserir múltiplos itens com quantidades definidas
    const handleInserirItensComQuantidades = () => {
        let inseridos = 0;

        // Inserir materiais com quantidades
        quantidadesMateriais.forEach((qtd, materialId) => {
            if (qtd > 0) {
                const material = materiais.find(m => m.id === materialId);
                if (material) {
                    handleAddItem(material, true, qtd);
                    inseridos++;
                }
            }
        });

        // Inserir serviços com quantidades
        quantidadesServicos.forEach((qtd, servicoId) => {
            if (qtd > 0) {
                const servico = servicos.find(s => s.id === servicoId);
                if (servico) {
                    handleAddServico(servico, true, qtd);
                    inseridos++;
                }
            }
        });

        // Inserir kits com quantidades
        quantidadesKits.forEach((qtd, kitId) => {
            if (qtd > 0) {
                const kit = kits.find(k => k.id === kitId);
                if (kit) {
                    handleAddKit(kit, true, qtd);
                    inseridos++;
                }
            }
        });

        // Inserir quadros com quantidades
        quantidadesQuadros.forEach((qtd, quadroId) => {
            if (qtd > 0) {
                const quadro = quadrosProntos.find(q => q.id === quadroId);
                if (quadro) {
                    handleAddQuadro(quadro, true, qtd);
                    inseridos++;
                }
            }
        });

        // Inserir cotações com quantidades
        quantidadesCotacoes.forEach((qtd, cotacaoId) => {
            if (qtd > 0) {
                const cotacao = cotacoes.find(c => c.id === cotacaoId);
                if (cotacao) {
                    handleAddCotacao(cotacao, true, undefined, qtd);
                    inseridos++;
                }
            }
        });

        if (inseridos > 0) {
            toast.success(`${inseridos} item(ns) inserido(s) com sucesso!`);
            // Limpar todas as quantidades
            setQuantidadesMateriais(new Map());
            setQuantidadesServicos(new Map());
            setQuantidadesKits(new Map());
            setQuantidadesQuadros(new Map());
            setQuantidadesCotacoes(new Map());
        } else {
            toast.warning('Nenhum item com quantidade definida para inserir');
        }
    };

    // Adicionar kit ao orçamento
    const handleAddKit = (kit: any, manterModalAberto = false, quantidade?: number) => {
        const qtd = quantidade || quantidadesKits.get(kit.id) || 1;

        // Calcular custo total do kit (soma dos preços de compra dos materiais do estoque real)
        const custoTotalKit = roundMoney(kit.items?.reduce((sum: number, kitItem: any) => {
            const precoCompra = kitItem.material?.preco || 0;
            return sum + (precoCompra * kitItem.quantidade);
        }, 0) || 0);

        // Calcular preço de venda total do kit (soma dos valorVenda || preco dos materiais do estoque real)
        let precoVendaTotalKit = kit.items?.reduce((sum: number, kitItem: any) => {
            const precoVenda = kitItem.material?.valorVenda || kitItem.material?.preco || 0;
            return sum + (precoVenda * kitItem.quantidade);
        }, 0) || 0;

        // IMPORTANTE: Incluir itens do banco frio E serviços no cálculo do preço de venda
        if (kit.itensFaltantes && Array.isArray(kit.itensFaltantes) && kit.itensFaltantes.length > 0) {
            const precoVendaExtras = kit.itensFaltantes.reduce((sum: number, item: any) => {
                // Incluir tanto cotações quanto serviços
                const precoUnit = item.precoUnit || item.preco || item.valorUnitario || 0;
                const quantidade = item.quantidade || 0;
                return sum + (precoUnit * quantidade);
            }, 0);
            precoVendaTotalKit += precoVendaExtras;
        }
        precoVendaTotalKit = roundMoney(precoVendaTotalKit);
        const precoBase = precoVendaTotalKit; // Preço base (2 decimais)

        const newItem: OrcamentoItem = {
            tipo: 'KIT',
            kitId: kit.id,
            nome: kit.nome,
            descricao: kit.descricao || kit.nome,
            unidadeMedida: 'UN',
            quantidade: qtd,
            custoUnit: custoTotalKit, // Custo é sempre a soma dos preços de compra
            precoBase: precoBase, // Preço base
            precoUnit: precoBase,
            subtotal: roundMoney(precoBase * qtd)
        };

        setItems(prev => [...prev, newItem]);

        // Limpar quantidade após adicionar
        atualizarQuantidadeKit(kit.id, 0);

        if (!manterModalAberto) {
            setShowItemModal(false);
        }
        setItemSearchTerm('');
        toast.success(`Kit adicionado ao orçamento (${qtd}x)`);
    };

    // Adicionar serviço ao orçamento
    const handleAddServico = (servico: any, manterModalAberto = false, quantidade?: number) => {
        const qtd = quantidade || quantidadesServicos.get(servico.id) || 1;
        const precoBase = servico.precoUnitario || servico.preco || 0;
        const newItem: OrcamentoItem = {
            tipo: 'SERVICO',
            servicoId: servico.id,
            servicoNome: servico.nome,
            nome: servico.nome,
            descricao: servico.descricao || servico.nome,
            unidadeMedida: servico.unidadeMedida || 'UN',
            quantidade: qtd,
            custoUnit: precoBase,
            precoBase: precoBase,
            precoUnit: precoBase,
            subtotal: precoBase * qtd
        };

        setItems(prev => [...prev, newItem]);

        // Limpar quantidade após adicionar
        atualizarQuantidadeServico(servico.id, 0);

        if (!manterModalAberto) {
            setShowItemModal(false);
        }
        setItemSearchTerm('');
        toast.success(`Serviço adicionado ao orçamento (${qtd}x)`);
    };

    // Adicionar quadro ao orçamento (alias para handleAddQuadroPronto)
    const handleAddQuadro = (quadro: any, manterModalAberto = false, quantidade?: number) => {
        return handleAddQuadroPronto(quadro, manterModalAberto, quantidade);
    };

    // Adicionar quadro pronto ao orçamento
    const handleAddQuadroPronto = (quadro: any, manterModalAberto = false, quantidade?: number) => {
        const qtd = quantidade || quantidadesQuadros.get(quadro.id) || 1;
        const newItem: OrcamentoItem = {
            tipo: 'QUADRO_PRONTO',
            quadroId: quadro.id,
            nome: quadro.nome,
            descricao: quadro.descricao || quadro.nome,
            unidadeMedida: 'UN',
            quantidade: qtd,
            custoUnit: quadro.precoVenda || quadro.custoTotal || 0,
            precoBase: quadro.precoVenda || quadro.custoTotal || 0,
            precoUnit: quadro.precoVenda || quadro.custoTotal || 0,
            subtotal: (quadro.precoVenda || quadro.custoTotal || 0) * qtd
        };

        setItems(prev => [...prev, newItem]);

        // Limpar quantidade após adicionar
        atualizarQuantidadeQuadro(quadro.id, 0);

        if (!manterModalAberto) {
            setShowItemModal(false);
        }
        setItemSearchTerm('');
        toast.success(`Quadro pronto adicionado ao orçamento (${qtd}x)`);
    };

    // Adicionar item manual (sem estoque)
    const handleAddItemManual = () => {
        // Validação
        if (!novoItemManual.nome.trim()) {
            toast.error('Nome do item obrigatório', {
                description: 'Digite o nome ou descrição do item'
            });
            return;
        }
        if (novoItemManual.custoUnit <= 0) {
            toast.error('Custo unitário inválido', {
                description: 'Digite um custo unitário maior que zero'
            });
            return;
        }
        if (novoItemManual.quantidade <= 0) {
            toast.error('Quantidade inválida', {
                description: 'Digite uma quantidade maior que zero'
            });
            return;
        }

        const precoBase = novoItemManual.custoUnit;
        const precoUnit = precoBase;

        const newItem: OrcamentoItem = {
            tipo: novoItemManual.tipo,
            nome: novoItemManual.nome,
            descricao: novoItemManual.descricao || novoItemManual.nome,
            unidadeMedida: novoItemManual.unidadeMedida,
            quantidade: novoItemManual.quantidade,
            custoUnit: precoBase,
            precoBase: precoBase,
            precoUnit: precoUnit,
            subtotal: precoUnit * novoItemManual.quantidade
        };

        setItems(prev => [...prev, newItem]);
        setShowItemModal(false);
        setItemSearchTerm('');
        setNovoItemManual({
            nome: '',
            descricao: '',
            unidadeMedida: 'UN',
            quantidade: 1,
            custoUnit: 0,
            tipo: 'MATERIAL'
        });
        toast.success('Item manual adicionado ao orçamento');
    };

    // Remover item
    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    // Atualizar quantidade do item
    const handleUpdateItemQuantity = (index: number, quantidade: number) => {
        setItems(prev => prev.map((item, i) => {
            if (i === index) {
                // Manter o precoUnit existente (já calculado com valorVenda || preco)
                // Apenas recalcular o subtotal com a nova quantidade
                return {
                    ...item,
                    quantidade,
                    subtotal: item.precoUnit * quantidade
                };
            }
            return item;
        }));
    };

    // Salvar orçamento usando o serviço
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validar items apenas ao CRIAR novo orçamento
        // Ao EDITAR, permite salvar sem items (mantém os existentes no backend)
        if (!orcamentoToEdit && items.length === 0) {
            setError('Adicione pelo menos um item ao orçamento');
            toast.error('Orçamento sem itens', {
                description: 'Adicione pelo menos um item antes de criar o orçamento'
            });
            return;
        }

        try {
            console.log('💾 Salvando orçamento...', formState);

            const orcamentoData: any = {
                clienteId: formState.clienteId,
                titulo: formState.titulo,
                descricao: formState.descricao,
                descricaoProjeto: formState.descricaoProjeto,
                validade: formState.validade,
                bdi: formState.bdi,
                observacoes: formState.observacoes,
                // Novos campos (empresa executora: Orçamento → PV → NF-e/NFS-e)
                empresaCNPJ: formState.empresaCNPJ,
                empresaFiscalId: formState.empresaFiscalId || undefined,
                enderecoObra: formState.enderecoObra,
                cidade: formState.cidade,
                bairro: formState.bairro,
                cep: formState.cep,
                responsavelObra: formState.responsavelObra,
                previsaoInicio: formState.previsaoInicio || null,
                previsaoTermino: formState.previsaoTermino || null,
                descontoValor: formState.descontoValor,
                impostoPercentual: formState.impostoPercentual,
                condicaoPagamento: formState.condicaoPagamento
            };

            // Incluir items apenas se houver items para enviar
            // Ao editar sem modificar items, o backend manterá os items existentes
            if (items.length > 0) {
                orcamentoData.items = items.map(item => ({
                    tipo: item.tipo,
                    materialId: item.materialId,
                    kitId: item.kitId,
                    cotacaoId: item.cotacaoId, // ✅ Incluir cotacaoId para itens do banco frio
                    quadroId: item.quadroId,
                    servicoId: item.servicoId,
                    servicoNome: item.servicoNome,
                    descricao: item.descricao || item.nome, // ✅ Enviar descricao ou nome como fallback
                    quantidade: item.quantidade,
                    custoUnit: item.custoUnit,
                    precoUnitario: item.precoUnit,
                    subtotal: item.subtotal
                }));
            }

            console.log('📤 Enviando dados do orçamento:', orcamentoData);

            let response;
            if (orcamentoToEdit) {
                console.log('🔄 Modo: EDIÇÃO - Atualizando orçamento existente');
                response = await orcamentosService.atualizar(orcamentoToEdit.id, orcamentoData);
            } else {
                console.log('✨ Modo: CRIAÇÃO - Criando novo orçamento');
                response = await orcamentosService.criar(orcamentoData);
            }

            console.log('📥 Resposta do servidor:', response);

            if (response.success) {
                console.log('✅ Orçamento salvo com sucesso');
                handleCloseModal();
                await loadData();

                // Mostrar mensagem de sucesso
                toast.success(`Orçamento ${orcamentoToEdit ? 'atualizado' : 'criado'}!`, {
                    description: orcamentoToEdit ? 'As alterações foram salvas' : 'Novo orçamento criado com sucesso'
                });
            } else {
                const errorMsg = response.error || 'Erro ao salvar orçamento';
                console.warn('⚠️ Erro ao salvar:', errorMsg);
                setError(errorMsg);
                toast.error('Erro ao salvar orçamento', {
                    description: errorMsg
                });
            }
        } catch (err) {
            console.error('❌ Erro crítico ao salvar orçamento:', err);
            const errorMsg = 'Erro de conexão ao salvar orçamento';
            setError(errorMsg);
        }
    };

    // Aprovar orçamento - Abre o AlertDialog
    const handleAprovarOrcamento = (orcamentoId: string) => {
        const orcamento = orcamentos.find(o => o.id === orcamentoId);
        if (orcamento) {
            setOrcamentoToAprovar(orcamento);
            setShowAprovarDialog(true);
        }
    };

    // Confirmar aprovação do orçamento
    const handleConfirmarAprovacao = async () => {
        if (!orcamentoToAprovar) return;

        const orcamentoId = orcamentoToAprovar.id;
        const response = await orcamentosService.aprovar(orcamentoId);

        if (response.success) {
            const data: any = response.data || response;
            const itemsFrios = data.itemsFrios || [];
            const itemsDisponiveis = data.itemsDisponiveis || [];

            // Mostrar mensagem personalizada baseada em items frios
            if (itemsFrios.length > 0) {
                // Criar lista de items frios para exibir
                const listaItemsFrios = itemsFrios.map((item: any) =>
                    `• ${item.nome} - Faltam: ${item.quantidadeFaltante || item.quantidadeNecessaria} ${item.sku ? `(${item.sku})` : ''}`
                ).join('\n');

                toast.warning('⚠️ Orçamento aprovado com restrições', {
                    description: `${itemsFrios.length} item(ns) sem estoque suficiente:\n${listaItemsFrios}\n\n📦 Realize a compra destes materiais antes de iniciar o projeto.`,
                    duration: 10000,
                    action: {
                        label: 'Entendi',
                        onClick: () => { }
                    }
                });
            } else {
                toast.success('✅ Orçamento aprovado!', {
                    description: `Todos os ${itemsDisponiveis.length} item(ns) estão disponíveis em estoque. O projeto foi criado e está pronto para aprovação.`
                });
            }

            await loadData();
        } else {
            toast.error('Erro ao aprovar', {
                description: response.error
            });
        }

        // Fechar o dialog
        setShowAprovarDialog(false);
        setOrcamentoToAprovar(null);
    };

    const handleAbrirAtualizarCliente = async (orcamento: Orcamento) => {
        const clienteId = (orcamento as any).clienteId || (orcamento as any).cliente?.id;
        if (!clienteId) {
            toast.error('Orçamento sem cliente vinculado.');
            return;
        }
        let clienteData: Cliente | null = (orcamento as any).cliente || null;
        if (!clienteData) {
            const res = await clientesService.buscar(clienteId);
            if (!res.success || !res.data) {
                toast.error(res.error || 'Cliente não encontrado.');
                return;
            }
            clienteData = res.data;
        }
        setClienteParaAtualizar(clienteData);
        setFormClienteAtualizar({
            nome: clienteData.nome || '',
            cpfCnpj: clienteData.cpfCnpj || '',
            endereco: clienteData.endereco || '',
            cidade: clienteData.cidade || '',
            estado: clienteData.estado || '',
            cep: clienteData.cep || '',
            telefone: clienteData.telefone || '',
            email: clienteData.email || ''
        });
        setShowModalAtualizarCliente(true);
    };

    const handleSalvarDadosCliente = async () => {
        if (!clienteParaAtualizar) return;
        if (!formClienteAtualizar.nome?.trim() || !formClienteAtualizar.cpfCnpj?.trim()) {
            toast.error('Preencha nome e CPF/CNPJ.');
            return;
        }
        setSalvandoCliente(true);
        try {
            const res = await clientesService.atualizar(clienteParaAtualizar.id, {
                nome: formClienteAtualizar.nome.trim(),
                cpfCnpj: formClienteAtualizar.cpfCnpj.replace(/\D/g, ''),
                endereco: formClienteAtualizar.endereco || undefined,
                cidade: formClienteAtualizar.cidade || undefined,
                estado: formClienteAtualizar.estado || undefined,
                cep: formClienteAtualizar.cep || undefined,
                telefone: formClienteAtualizar.telefone || undefined,
                email: formClienteAtualizar.email || undefined
            });
            if (res.success) {
                toast.success('Dados do cliente atualizados.', { description: 'CPF/CNPJ e endereço de cobrança (usado na NF) foram salvos.' });
                setShowModalAtualizarCliente(false);
                setClienteParaAtualizar(null);
                await loadData();
            } else {
                toast.error(res.error || 'Erro ao atualizar cliente.');
            }
        } finally {
            setSalvandoCliente(false);
        }
    };

    // Declinar orçamento (confirmação)
    const [orcamentoToDeclinar, setOrcamentoToDeclinar] = useState<Orcamento | null>(null);
    const [showDeclinarDialog, setShowDeclinarDialog] = useState(false);

    const handleDeclinarOrcamento = (orcamento: Orcamento, fecharModalView = false) => {
        setOrcamentoToDeclinar(orcamento);
        if (fecharModalView) setOrcamentoToView(null);
        setShowDeclinarDialog(true);
    };

    const handleConfirmarDeclinio = async () => {
        if (!orcamentoToDeclinar) return;
        const id = orcamentoToDeclinar.id;
        setShowDeclinarDialog(false);
        setOrcamentoToDeclinar(null);
        await handleChangeStatus(id, 'Declinado');
        if (orcamentoToView?.id === id) setOrcamentoToView(null);
    };

    // Excluir orçamento
    const [orcamentoToDelete, setOrcamentoToDelete] = useState<Orcamento | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePermanent, setDeletePermanent] = useState(false); // true = permanente, false = soft delete

    const handleDeleteOrcamento = async () => {
        if (!orcamentoToDelete) return;

        const response = await orcamentosService.excluir(orcamentoToDelete.id, deletePermanent);

        if (response.success) {
            const message = deletePermanent
                ? `Orçamento "${orcamentoToDelete.titulo}" foi excluído permanentemente do banco de dados`
                : `Orçamento "${orcamentoToDelete.titulo}" foi cancelado com sucesso`;
            toast.success(deletePermanent ? 'Orçamento excluído' : 'Orçamento cancelado', {
                description: message
            });
            await loadData();
        } else {
            toast.error('Erro ao excluir', {
                description: response.error || 'Não foi possível excluir o orçamento'
            });
        }

        setShowDeleteDialog(false);
        setOrcamentoToDelete(null);
        setDeletePermanent(false);
    };

    // Alterar status do orçamento
    const handleChangeStatus = async (orcamentoId: string, novoStatus: 'Pendente' | 'Enviado ao Cliente' | 'Aprovado' | 'Recusado' | 'Declinado' | 'Cancelado') => {
        const promise = (async () => {
            console.log(`🔄 Alterando status do orçamento ${orcamentoId} para ${novoStatus}...`);

            const response = await orcamentosService.atualizarStatus(orcamentoId, novoStatus);

            if (response.success) {
                console.log('✅ Status alterado com sucesso');
                await loadData();
                return response.message || `Status alterado para ${novoStatus}`;
            } else {
                const errorMsg = response.error || 'Erro ao alterar status';
                console.warn('⚠️ Erro ao alterar status:', errorMsg);
                throw new Error(errorMsg);
            }
        })();

        toast.promise(promise, {
            loading: `Alterando status para ${novoStatus}...`,
            success: (message) => message,
            error: (err) => err.message || 'Erro ao alterar status'
        });
    };

    // Preparar dados do orçamento para PDF customizado
    const prepararDadosParaPDF = (orcamento: Orcamento): OrcamentoPDFData => {
        // Buscar dados completos do cliente
        const clienteCompleto = clientes.find(c => c.id === orcamento.clienteId);

        return {
            numero: orcamento.id.substring(0, 8).toUpperCase(),
            numeroSequencial: orcamento.numeroSequencial || undefined,
            data: new Date(orcamento.createdAt).toLocaleDateString('pt-BR'),
            emissao: new Date(orcamento.createdAt).toLocaleDateString('pt-BR'),
            validade: new Date(orcamento.validade || orcamento.createdAt).toLocaleDateString('pt-BR'),
            enderecos: {
                cobranca: clienteCompleto?.endereco,
                obra: (orcamento as any).enderecoObra
            },
            cliente: {
                nome: orcamento.cliente?.nome || clienteCompleto?.nome || 'Cliente não informado',
                cpfCnpj: (orcamento.cliente as any)?.cpfCnpj || clienteCompleto?.cpfCnpj || '',
                endereco: clienteCompleto?.endereco,
                telefone: clienteCompleto?.telefone,
                email: clienteCompleto?.email
            },
            projeto: {
                titulo: orcamento.titulo,
                descricao: orcamento.descricao,
                enderecoObra: (orcamento as any).enderecoObra,
                cidade: (orcamento as any).cidade,
                bairro: (orcamento as any).bairro,
                cep: (orcamento as any).cep
            },
            prazos: {
                previsaoInicio: (orcamento as any).previsaoInicio ? new Date((orcamento as any).previsaoInicio).toLocaleDateString('pt-BR') : undefined,
                previsaoTermino: (orcamento as any).previsaoTermino ? new Date((orcamento as any).previsaoTermino).toLocaleDateString('pt-BR') : undefined
            },
            items: (orcamento.items || []).map((item: any) => {
                return {
                    codigo: item.materialId || item.kitId || item.cotacaoId,
                    nome: getItemNome(item),
                    descricao: shouldShowDescricao(item) ? item.descricao : undefined,
                    unidade: item.unidadeMedida || 'UN',
                    quantidade: item.quantidade,
                    valorUnitario: item.precoUnit ?? item.precoUnitario ?? item.valorUnitario ?? 0,
                    valorTotal: item.subtotal ?? item.valorTotal ?? 0
                };
            }),
            financeiro: {
                subtotal: orcamento.custoTotal ?? 0,
                bdi: orcamento.bdi,
                valorComBDI: orcamento.custoTotal ?? 0,
                desconto: orcamento.descontoValor ?? 0,
                impostos: orcamento.impostoPercentual ?? 0,
                valorTotal: orcamento.precoVenda ?? orcamento.valorTotal ?? 0,
                condicaoPagamento: orcamento.condicaoPagamento ?? 'À Vista'
            },
            orcamentistaNome: (() => {
                const nome = (orcamento as any).orcamentistaNome;
                if (!nome || !String(nome).trim()) return undefined;
                const s = String(nome).trim();
                // Não truncar "Não identificado" para "Não" no PDF
                if (s === 'Não identificado') return s;
                return s.split(/\s+/)[0];
            })(),
            observacoes: orcamento.observacoes,
            descricaoTecnica: (orcamento as any).descricaoProjeto,
            fotos: [], // Fotos agora estão inline no HTML do Jodit
            empresa: {
                nome: 'S3E Engenharia',
                cnpj: '00.000.000/0000-00',
                endereco: 'Endereço da empresa',
                telefone: '(48) 0000-0000',
                email: 'contato@s3e.com.br'
            }
        };
    };

    // Abrir modal de customização de PDF
    const handlePersonalizarPDF = (orcamento: Orcamento) => {
        setOrcamentoForPDF(orcamento);
        setShowPDFCustomization(true);
    };

    // Removido: "Gerar PDF profissional" via /pdf/preview (evita fluxos paralelos e confusão com envio no WhatsApp CRM)

    // Gerar PDF do orçamento (função antiga mantida para compatibilidade)
    const handleGerarPDF = (orcamento: Orcamento) => {
        try {
            console.log('📄 Gerando PDF do orçamento:', orcamento.id);

            const pdfData: OrcamentoPDFDataOld = {
                id: orcamento.id.substring(0, 8).toUpperCase(),
                titulo: orcamento.titulo,
                cliente: {
                    nome: orcamento.cliente?.nome || 'Cliente não informado',
                    cpfCnpj: (orcamento.cliente as any)?.cpfCnpj || '',
                    endereco: (orcamento.cliente as any)?.endereco,
                    telefone: orcamento.cliente?.telefone
                },
                data: new Date(orcamento.createdAt).toLocaleDateString('pt-BR'),
                validade: new Date(orcamento.validade || orcamento.createdAt).toLocaleDateString('pt-BR'),
                descricao: orcamento.descricao,
                items: (orcamento.items || []).map((item: any) => ({
                    nome: getItemNome(item),
                    quantidade: item.quantidade,
                    valorUnit: item.precoUnit || item.precoUnitario,
                    valorTotal: item.subtotal
                })),
                subtotal: orcamento.custoTotal ?? 0,
                bdi: orcamento.bdi,
                valorTotal: orcamento.precoVenda ?? orcamento.valorTotal ?? 0,
                observacoes: orcamento.observacoes
            };

            generateOrcamentoPDF(pdfData);
            toast.success('PDF gerado com sucesso!', {
                description: 'O download foi iniciado automaticamente'
            });
        } catch (error) {
            console.error('❌ Erro ao gerar PDF:', error);
            toast.error('Erro ao gerar PDF', {
                description: 'Verifique o console para mais detalhes'
            });
        }
    };


    // Status styling
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Pendente': return 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200';
            case 'Enviado ao Cliente': return 'bg-blue-100 text-blue-800 ring-1 ring-blue-200';
            case 'Aprovado': return 'bg-green-100 text-green-800 ring-1 ring-green-200';
            case 'Recusado': return 'bg-red-100 text-red-800 ring-1 ring-red-200';
            case 'Declinado': return 'bg-gray-900 text-white ring-1 ring-gray-800';
            case 'Cancelado': return 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
            default: return 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 dark:border-purple-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando orçamentos...</p>
                </div>
            </div>
        );
    }

    // Se a aba ativa for 'novo', renderiza a nova página
    if (abaAtiva === 'novo') {
        return (
            <NovoOrcamentoPage
                setAbaAtiva={setAbaAtiva}
                onOrcamentoCriado={loadData}
                initialDataFromLead={initialDataFromLead ?? undefined}
                onConsumedInitialData={() => setInitialDataFromLead(null)}
            />
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Orçamentos</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Gerencie seus orçamentos e propostas comerciais</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex gap-2">
                        <ActionsDropdown
                            label="Ações"
                            className="flex-shrink-0"
                            actions={[
                                {
                                    label: loading ? 'Carregando...' : 'Atualizar',
                                    icon: (
                                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    ),
                                    onClick: loadData,
                                    disabled: loading,
                                    variant: 'primary'
                                },
                                {
                                    label: 'Exportar Template',
                                    icon: <DocumentArrowDownIcon className="w-4 h-4" />,
                                    onClick: handleExportTemplate,
                                    variant: 'default'
                                },
                                {
                                    label: 'Exportar Orçamentos',
                                    icon: <DocumentArrowDownIcon className="w-4 h-4" />,
                                    onClick: handleExportData,
                                    disabled: orcamentos.length === 0,
                                    variant: 'default'
                                },
                                {
                                    label: importing ? 'Importando...' : 'Importar Orçamentos',
                                    icon: <DocumentArrowUpIcon className="w-4 h-4" />,
                                    onClick: handleImportClick,
                                    disabled: importing,
                                    variant: 'success'
                                }
                            ]}
                        />
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleImportFile}
                            style={{ display: 'none' }}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setAbaAtiva('novo')}
                            className="btn-primary flex items-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Novo Orçamento
                        </button>
                    </div>
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

            {/* Modal Atualizar dados cliente (CPF/CNPJ e endereço de cobrança para NF) */}
            {showModalAtualizarCliente && clienteParaAtualizar && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-lg w-full overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-dark-border">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">Atualizar dados do cliente</h3>
                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                                CPF/CNPJ e endereço de cobrança (usado na emissão de NF/NFS-e). O endereço da obra no orçamento é apenas para fluxo interno.
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Nome *</label>
                                <input value={formClienteAtualizar.nome} onChange={(e) => setFormClienteAtualizar({ ...formClienteAtualizar, nome: e.target.value })} className="input-field w-full" placeholder="Nome ou razão social" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">CPF/CNPJ *</label>
                                <input value={formClienteAtualizar.cpfCnpj} onChange={(e) => setFormClienteAtualizar({ ...formClienteAtualizar, cpfCnpj: e.target.value })} className="input-field w-full" placeholder="000.000.000-00 ou 00.000.000/0000-00" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Endereço (cobrança)</label>
                                <input value={formClienteAtualizar.endereco} onChange={(e) => setFormClienteAtualizar({ ...formClienteAtualizar, endereco: e.target.value })} className="input-field w-full" placeholder="Logradouro, número, complemento" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Cidade</label>
                                    <input value={formClienteAtualizar.cidade} onChange={(e) => setFormClienteAtualizar({ ...formClienteAtualizar, cidade: e.target.value })} className="input-field w-full" placeholder="Cidade" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Estado</label>
                                    <input value={formClienteAtualizar.estado} onChange={(e) => setFormClienteAtualizar({ ...formClienteAtualizar, estado: e.target.value })} className="input-field w-full" placeholder="UF" maxLength={2} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">CEP</label>
                                <input value={formClienteAtualizar.cep} onChange={(e) => setFormClienteAtualizar({ ...formClienteAtualizar, cep: e.target.value })} className="input-field w-full" placeholder="00000-000" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">Telefone</label>
                                    <input value={formClienteAtualizar.telefone} onChange={(e) => setFormClienteAtualizar({ ...formClienteAtualizar, telefone: e.target.value })} className="input-field w-full" placeholder="(00) 00000-0000" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-1">E-mail</label>
                                    <input type="email" value={formClienteAtualizar.email} onChange={(e) => setFormClienteAtualizar({ ...formClienteAtualizar, email: e.target.value })} className="input-field w-full" placeholder="email@exemplo.com" />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 dark:border-dark-border flex justify-end gap-3">
                            <button type="button" onClick={() => { setShowModalAtualizarCliente(false); setClienteParaAtualizar(null); }} className="btn-secondary">Cancelar</button>
                            <button type="button" onClick={handleSalvarDadosCliente} disabled={salvandoCliente} className="btn-primary">
                                {salvandoCliente ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Abas de Navegação: Listagem | Expirados | Declinados */}
            <div className="bg-white rounded-2xl shadow-soft border border-gray-100 mb-6">
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setAbaAtiva('listagem')}
                        className={`flex-1 px-6 py-4 text-center font-semibold transition-all ${abaAtiva === 'listagem'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span>📋</span>
                            <span>Listagem</span>
                            {abaAtiva === 'listagem' && (
                                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                    {filteredOrcamentos.length}
                                </span>
                            )}
                        </div>
                    </button>
                    <button
                        onClick={() => setAbaAtiva('expirados')}
                        className={`flex-1 px-6 py-4 text-center font-semibold transition-all relative ${abaAtiva === 'expirados'
                                ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                                : 'text-gray-600 hover:text-amber-600 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span>⏰</span>
                            <span>Expirados</span>
                            {orcamentosExpirados.length > 0 && (
                                <span
                                    className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-white"
                                    title={`${orcamentosExpirados.length} orçamento(s) expirado(s)`}
                                >
                                    {orcamentosExpirados.length > 99 ? '99+' : orcamentosExpirados.length}
                                </span>
                            )}
                            {abaAtiva === 'expirados' && (
                                <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                                    {orcamentosExpirados.length}
                                </span>
                            )}
                        </div>
                    </button>
                    <button
                        onClick={() => setAbaAtiva('declinados')}
                        className={`flex-1 px-6 py-4 text-center font-semibold transition-all ${abaAtiva === 'declinados'
                                ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                                : 'text-gray-600 hover:text-red-600 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span>❌</span>
                            <span>Declinados</span>
                            {abaAtiva === 'declinados' && (
                                <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                                    {orcamentosDeclinados.length}
                                </span>
                            )}
                        </div>
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por título ou cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>
                    </div>

                    {abaAtiva === 'listagem' && (
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full min-w-[180px] px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="Todos">Todos os Status</option>
                                <option value="Pendente">Pendente</option>
                                <option value="Enviado ao Cliente">Enviado ao Cliente</option>
                                <option value="Aprovado">Aprovado</option>
                                <option value="Recusado">Recusado</option>
                            </select>
                            {statusFilter === 'Aprovado' && (
                                <button
                                    type="button"
                                    onClick={() => setSortAprovadosPorDataAprovacao(prev => !prev)}
                                    className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium whitespace-nowrap transition-colors ${
                                        sortAprovadosPorDataAprovacao
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    }`}
                                    title={sortAprovadosPorDataAprovacao ? 'Ordenar por sequência (padrão)' : 'Ordenar por data de aprovação (mais recentes primeiro)'}
                                >
                                    <ArrowsUpDownIcon className="w-5 h-5" />
                                    {sortAprovadosPorDataAprovacao ? 'Mais recentes aprovados' : 'Por data de aprovação'}
                                </button>
                            )}
                        </div>
                    )}
                    {abaAtiva === 'expirados' && (
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
                            <p className="text-xs text-amber-800 font-semibold">
                                ⏰ Exibindo apenas orçamentos com validade vencida
                            </p>
                        </div>
                    )}
                    {abaAtiva === 'declinados' && (
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3">
                            <p className="text-xs text-red-800 font-semibold">
                                ❌ Exibindo apenas orçamentos recusados, declinados ou cancelados
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        {abaAtiva === 'expirados' ? (
                            <>
                                Exibindo <span className="font-bold text-gray-900">{filteredOrcamentos.length}</span> orçamento(s) expirado(s)
                            </>
                        ) : abaAtiva === 'declinados' ? (
                            <>
                                Exibindo <span className="font-bold text-gray-900">{filteredOrcamentos.length}</span> orçamento(s) declinado(s)
                            </>
                        ) : (
                            <>
                                Exibindo <span className="font-bold text-gray-900">{filteredOrcamentos.length}</span> de <span className="font-bold text-gray-900">{orcamentos.length}</span> orçamentos
                            </>
                        )}
                    </p>
                    <div className="flex items-center gap-4">
                        <ViewToggle view={viewMode} onViewChange={handleViewModeChange} />
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Pendente: {orcamentos.filter(o => o.status === 'Pendente').length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Aprovado: {orcamentos.filter(o => o.status === 'Aprovado').length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Recusado: {orcamentos.filter(o => o.status === 'Recusado').length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${error ? 'bg-red-500' : orcamentos.length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                            <span className="text-xs text-gray-600">
                                {error ? 'API Error' : orcamentos.length > 0 ? 'API Online' : 'Carregando...'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid de Orçamentos */}
            {filteredOrcamentos.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">{abaAtiva === 'expirados' ? '⏰' : abaAtiva === 'declinados' ? '❌' : '📋'}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {abaAtiva === 'expirados'
                            ? 'Nenhum orçamento expirado'
                            : abaAtiva === 'declinados'
                                ? 'Nenhum orçamento declinado'
                                : 'Nenhum orçamento encontrado'}
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {abaAtiva === 'expirados'
                            ? 'Não há orçamentos com validade vencida no momento.'
                            : abaAtiva === 'declinados'
                                ? 'Não há orçamentos recusados, declinados ou cancelados.'
                                : searchTerm || statusFilter !== 'Todos'
                                    ? 'Tente ajustar os filtros de busca'
                                    : 'Comece criando seu primeiro orçamento'}
                    </p>
                    {abaAtiva === 'listagem' && !searchTerm && statusFilter === 'Todos' && (
                        <button
                            onClick={() => setAbaAtiva('novo')}
                            className="btn-primary flex items-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Criar Primeiro Orçamento
                        </button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOrcamentos.map((orcamento) => {
                        const stripeClass = getOrcamentoCardStripeClass(orcamento.status, abaAtiva);
                        return (
                        <div
                            key={orcamento.id}
                            className="flex rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-dark-border shadow-soft hover:shadow-medium hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
                        >
                            {stripeClass ? (
                                <div
                                    className={`w-1.5 shrink-0 min-h-[8rem] ${stripeClass}`}
                                    title={orcamento.status}
                                    aria-hidden
                                />
                            ) : null}
                            <div className="flex-1 p-6 bg-white dark:bg-dark-card min-w-0">
                            {/* Header do Card */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 text-xs font-mono font-bold bg-gray-100 text-gray-700 rounded">
                                            #{orcamento.numeroSequencial || '---'}
                                        </span>
                                        <h3 className="font-bold text-lg text-gray-900">{orcamento.titulo}</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 text-xs font-bold rounded-lg bg-purple-100 text-purple-800 ring-1 ring-purple-200">
                                            📋 Orçamento
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${getStatusClass(orcamento.status)}`}>
                                        {orcamento.status === 'Pendente' && '⏳ '}
                                        {orcamento.status === 'Aprovado' && '✅ '}
                                        {orcamento.status === 'Recusado' && '❌ '}
                                        {orcamento.status}
                                    </span>
                                    {isOrcamentoExpirado(orcamento) && (
                                        <span className="px-2 py-1 text-xs font-bold rounded-lg bg-orange-100 text-orange-800 ring-1 ring-orange-200">
                                            ⏰ Expirado
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Informações */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>👤</span>
                                    <span className="truncate">{orcamento.cliente?.nome || 'Cliente não informado'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>💰</span>
                                    {(() => {
                                        const valorAReceber = calcularValorAReceberDoOrcamento(orcamento as any);
                                        const valorVendaDireta = calcularValorVendaDiretaDoOrcamento(orcamento as any);
                                        const totalCliente = roundMoney(Number((orcamento as any).precoVenda) || 0);
                                        const temVendaDireta = valorVendaDireta > 0.009 && totalCliente > valorAReceber + 0.009;
                                        return (
                                            <div className="flex flex-col leading-tight">
                                                <span className="font-bold text-purple-700">
                                                    R$ {valorAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                                {temVendaDireta && (
                                                    <span className="text-xs text-gray-500">
                                                        Total cliente: R$ {totalCliente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • Venda direta: R$ {valorVendaDireta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                                {/* Validade - apenas para orçamentos não aprovados */}
                                {orcamento.status !== 'Aprovado' && (
                                    <div className={`flex items-center gap-2 text-sm ${isOrcamentoExpirado(orcamento) ? 'text-orange-600 font-semibold' : 'text-gray-600'}`}>
                                        <span>📅</span>
                                        <span>
                                            {isOrcamentoExpirado(orcamento) ? '⏰ ' : ''}
                                            Válido até: {new Date(orcamento.validade || orcamento.createdAt).toLocaleDateString('pt-BR')}
                                            {isOrcamentoExpirado(orcamento) && ' (Expirado)'}
                                        </span>
                                    </div>
                                )}
                                {/* Quando aprovado, mostrar data de aprovação ao invés de validade */}
                                {orcamento.status === 'Aprovado' && orcamento.aprovedAt && (
                                    <div className="flex items-center gap-2 text-sm text-green-600">
                                        <span>✅</span>
                                        <span>Aprovado em: {orcamento.aprovedAt ? new Date(orcamento.aprovedAt).toLocaleDateString('pt-BR') : ''}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>📝</span>
                                    <span>{orcamento.items?.length || 0} item(s)</span>
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            // Buscar orçamento completo do backend para garantir relações carregadas
                                            const response = await orcamentosService.buscar(orcamento.id);
                                            if (response.success && response.data) {
                                                // Debug: verificar se itensDoKit está presente
                                                console.log('📦 Orçamento carregado:', response.data);
                                                if (response.data.items) {
                                                    response.data.items.forEach((item: any, idx: number) => {
                                                        if (item.tipo === 'KIT') {
                                                            console.log(`🔍 Item KIT ${idx}:`, {
                                                                nome: item.nome || item.descricao,
                                                                itensDoKit: item.itensDoKit,
                                                                temItensDoKit: !!item.itensDoKit,
                                                                tipoItensDoKit: typeof item.itensDoKit,
                                                                isArray: Array.isArray(item.itensDoKit)
                                                            });
                                                        }
                                                    });
                                                }
                                                setOrcamentoToView(response.data);
                                            } else {
                                                // Fallback: usar o orçamento da lista
                                                setOrcamentoToView(orcamento);
                                            }
                                        }}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                    >
                                        <EyeIcon className="w-4 h-4" />
                                        Ver
                                    </button>
                                    <button
                                        onClick={() => handlePersonalizarPDF(orcamento)}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 rounded-lg hover:from-purple-200 hover:to-indigo-200 transition-all text-sm font-semibold shadow-sm"
                                        title="Personalizar e gerar PDF"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                        </svg>
                                        PDF
                                    </button>
                                    <button
                                        onClick={() => handleOpenModal(orcamento)}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-semibold"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                        Editar
                                    </button>
                                    {canDelete(user) ? (
                                        // Desenvolvedor/Admin: dois botões
                                        <>
                                            <button
                                                onClick={() => {
                                                    setOrcamentoToDelete(orcamento);
                                                    setDeletePermanent(false);
                                                    setShowDeleteDialog(true);
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-semibold"
                                                title="Cancelar orçamento (pode ser reativado)"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setOrcamentoToDelete(orcamento);
                                                    setDeletePermanent(true);
                                                    setShowDeleteDialog(true);
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
                                                title="Excluir permanentemente do banco de dados"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                                Excluir
                                            </button>
                                        </>
                                    ) : (
                                        // Outros usuários: apenas cancelar
                                        <button
                                            onClick={() => {
                                                setOrcamentoToDelete(orcamento);
                                                setDeletePermanent(false);
                                                setShowDeleteDialog(true);
                                            }}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-semibold"
                                            title="Cancelar orçamento"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Cancelar
                                        </button>
                                    )}
                                </div>

                                {/* Botões de Status */}
                                {orcamento.status === 'Pendente' && (
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handleChangeStatus(orcamento.id, 'Enviado ao Cliente')}
                                            className="flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all font-semibold shadow-md text-sm"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                            Enviado ao Cliente
                                        </button>
                                        <button
                                            onClick={() => handleAprovarOrcamento(orcamento.id)}
                                            className="flex items-center justify-center gap-1 w-full px-3 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600 transition-all font-semibold shadow-md"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Aprovar
                                        </button>
                                    </div>
                                )}
                                {orcamento.status === 'Enviado ao Cliente' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAprovarOrcamento(orcamento.id)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600 transition-all font-semibold shadow-md"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Aprovar
                                        </button>
                                        <button
                                            onClick={() => handleDeclinarOrcamento(orcamento)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-lg hover:from-gray-800 hover:to-gray-700 transition-all font-semibold shadow-md"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                            Declinar
                                        </button>
                                    </div>
                                )}
                                {orcamento.status === 'Aprovado' && (
                                    <button
                                        onClick={() => handleDeclinarOrcamento(orcamento)}
                                        className="flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg hover:from-orange-700 hover:to-orange-600 transition-all font-semibold shadow-md text-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        Declinar
                                    </button>
                                )}
                            </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            ) : (
                /* Visualização em Lista */
                <div className="bg-white border border-gray-200 rounded-2xl shadow-soft" style={{ overflow: 'visible', position: 'relative' }}>
                    <div className="overflow-x-auto" style={{ overflowY: 'visible' }}>
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase w-16">Nº</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Cliente</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Título</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">A receber (PV)</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Validade</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase min-w-[200px]">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredOrcamentos.map((orcamento, index) => (
                                    <tr key={orcamento.id} className="hover:bg-gray-50 transition-colors">
                                        <td className={`px-6 py-4 text-center ${getOrcamentoRowLateralBorderClass(orcamento.status, abaAtiva)}`}>

                                            <span className="text-sm font-semibold text-gray-600">{orcamento.numeroSequencial || index + 1}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">{orcamento.cliente?.nome || 'N/A'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900">{orcamento.titulo}</p>
                                            <p className="text-xs text-gray-500">#{orcamento.numeroSequencial ?? orcamento.numero ?? orcamento.id.substring(0, 8)}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {(() => {
                                                const valorAReceber = calcularValorAReceberDoOrcamento(orcamento as any);
                                                const valorVendaDireta = calcularValorVendaDiretaDoOrcamento(orcamento as any);
                                                const totalCliente = roundMoney(Number((orcamento as any).precoVenda) || 0);
                                                const temVendaDireta = valorVendaDireta > 0.009 && totalCliente > valorAReceber + 0.009;
                                                return (
                                                    <div className="flex flex-col items-end leading-tight">
                                                        <span className="text-lg font-bold text-purple-700">
                                                            R$ {valorAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </span>
                                                        {temVendaDireta && (
                                                            <span className="text-xs text-gray-500">
                                                                Total cliente: R$ {totalCliente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {orcamento.status === 'Aprovado' ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <p className="text-xs text-gray-400 italic">Histórico</p>
                                                    <p className="text-xs text-gray-500">{new Date(orcamento.validade || orcamento.createdAt).toLocaleDateString('pt-BR')}</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                    <p className={`text-sm ${isOrcamentoExpirado(orcamento) ? 'text-orange-600 font-semibold' : 'text-gray-600'}`}>
                                                        {new Date(orcamento.validade || orcamento.createdAt).toLocaleDateString('pt-BR')}
                                                    </p>
                                                    {isOrcamentoExpirado(orcamento) && (
                                                        <span className="text-xs text-orange-600 font-semibold">⏰ Expirado</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`px-3 py-1 text-xs font-bold rounded-lg ${getStatusClass(orcamento.status)}`}>
                                                    {orcamento.status === 'Pendente' && '⏳ '}
                                                    {orcamento.status === 'Enviado ao Cliente' && '📤 '}
                                                    {orcamento.status === 'Aprovado' && '✅ '}
                                                    {orcamento.status === 'Recusado' && '❌ '}
                                                    {orcamento.status === 'Declinado' && '🔻 '}
                                                    {orcamento.status === 'Cancelado' && '🚫 '}
                                                    {orcamento.status}
                                                </span>
                                                {isOrcamentoExpirado(orcamento) && (
                                                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-orange-100 text-orange-800">
                                                        ⏰ Expirado
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4" style={{ position: 'relative', overflow: 'visible', zIndex: 'auto' }}>
                                            <div className="flex items-center justify-center" style={{ position: 'relative' }}>
                                                <ActionsDropdown
                                                    actions={[
                                                        {
                                                            label: 'Visualizar',
                                                            icon: (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            ),
                                                            onClick: async () => {
                                                                // Buscar orçamento completo do backend para garantir relações carregadas
                                                                const response = await orcamentosService.buscar(orcamento.id);
                                                                if (response.success && response.data) {
                                                                    setOrcamentoToView(response.data);
                                                                } else {
                                                                    // Fallback: usar o orçamento da lista
                                                                    setOrcamentoToView(orcamento);
                                                                }
                                                            },
                                                            variant: 'primary'
                                                        },
                                                        {
                                                            label: 'Editar',
                                                            icon: (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            ),
                                                            onClick: () => handleOpenModal(orcamento),
                                                            variant: 'default'
                                                        },
                                                        {
                                                            label: 'Copiar',
                                                            icon: (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                </svg>
                                                            ),
                                                            onClick: async () => {
                                                                // Buscar orçamento completo
                                                                const response = await orcamentosService.buscar(orcamento.id);
                                                                if (response.success && response.data) {
                                                                    const orcData = response.data;
                                                                    const itemsMapeados = mapItensOrcamentoParaCopia(orcData.items || []);

                                                                    // Salvar no localStorage (sem cliente)
                                                                    const orcamentoCopia = {
                                                                        empresaCNPJ: orcData.empresaCNPJ,
                                                                        titulo: orcData.titulo,
                                                                        descricao: orcData.descricao,
                                                                        descricaoProjeto: orcData.descricaoProjeto,
                                                                        validade: orcData.validade,
                                                                        endereco: orcData.enderecoObra,
                                                                        bairro: orcData.bairro,
                                                                        cidade: orcData.cidade,
                                                                        cep: orcData.cep,
                                                                        responsavelObra: orcData.responsavelObra,
                                                                        bdi: orcData.bdi,
                                                                        previsaoInicio: orcData.previsaoInicio,
                                                                        previsaoTermino: orcData.previsaoTermino,
                                                                        condicaoPagamento: orcData.condicaoPagamento,
                                                                        items: itemsMapeados
                                                                    };
                                                                    localStorage.setItem('orcamentoCopia', JSON.stringify(orcamentoCopia));
                                                                    toast.success('Orçamento copiado', {
                                                                        description: 'Abrindo novo orçamento...'
                                                                    });
                                                                    setAbaAtiva('novo');
                                                                } else {
                                                                    toast.error('Erro ao copiar orçamento', {
                                                                        description: response.error || 'Não foi possível buscar os dados'
                                                                    });
                                                                }
                                                            },
                                                            variant: 'default'
                                                        },
                                                        {
                                                            label: 'PDF',
                                                            icon: (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                                                </svg>
                                                            ),
                                                            onClick: () => handlePersonalizarPDF(orcamento),
                                                            variant: 'default'
                                                        },
                                                        // Ações de status
                                                        {
                                                            label: 'Enviado-Cliente',
                                                            icon: (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                                </svg>
                                                            ),
                                                            onClick: () => handleChangeStatus(orcamento.id, 'Enviado ao Cliente'),
                                                            variant: 'primary',
                                                            show: orcamento.status === 'Pendente'
                                                        },
                                                        {
                                                            label: 'Declinar Orçamento',
                                                            icon: (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            ),
                                                            onClick: () => handleDeclinarOrcamento(orcamento),
                                                            variant: 'danger',
                                                            show: orcamento.status === 'Aprovado'
                                                        },
                                                        {
                                                            label: 'Excluir Permanentemente',
                                                            icon: <TrashIcon className="w-4 h-4" />,
                                                            onClick: () => {
                                                                setOrcamentoToDelete(orcamento);
                                                                setDeletePermanent(true);
                                                                setShowDeleteDialog(true);
                                                            },
                                                            variant: 'danger',
                                                            show: canDelete(user)
                                                        }
                                                    ]}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-6xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
                        {/* Header */}
                        <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-[#0a1a2f]">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-medium">
                                    {orcamentoToEdit ? <PencilIcon className="w-7 h-7 text-white" /> : <PlusIcon className="w-7 h-7 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-white">
                                        {orcamentoToEdit ? 'Editar Orçamento' : 'Novo Orçamento'}
                                    </h2>
                                    <p className="text-sm text-white/80 mt-1">
                                        {orcamentoToEdit ? 'Atualize as informações do orçamento' : 'Crie uma nova proposta comercial'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* SEÇÃO 1: Informações Básicas */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">📋</span>
                                    Informações Básicas
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Empresa executora (Orçamento → PV → NF-e/NFS-e)
                                        </label>
                                        <select
                                            value={formState.empresaFiscalId}
                                            onChange={(e) => {
                                                const id = e.target.value;
                                                const emp = empresasFiscais.find(ef => ef.id === id);
                                                setFormState(prev => ({
                                                    ...prev,
                                                    empresaFiscalId: id,
                                                    empresaCNPJ: emp ? emp.cnpj : prev.empresaCNPJ
                                                }));
                                            }}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="">Selecione a empresa (prestadora)</option>
                                            {empresasFiscais
                                                .filter(ef => ef.ativo !== false)
                                                .map(ef => (
                                                    <option key={ef.id} value={ef.id}>
                                                        {(ef.nomeFantasia || ef.razaoSocial) + ' — ' + (ef.cnpj || '')}
                                                    </option>
                                                ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">Mesma empresa será usada no PV e na emissão de NF-e/NFS-e.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Cliente *
                                        </label>
                                        <select
                                            value={formState.clienteId}
                                            onChange={(e) => setFormState(prev => ({ ...prev, clienteId: e.target.value }))}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="">Selecione um cliente</option>
                                            {Array.isArray(clientes) && clientes.length > 0 ? (
                                                clientes.map(cliente => (
                                                    <option key={cliente.id} value={cliente.id}>
                                                        {cliente.nome} - {cliente.cpfCnpj}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="" disabled>Nenhum cliente disponível</option>
                                            )}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Título do Projeto *
                                        </label>
                                        <input
                                            type="text"
                                            value={formState.titulo}
                                            onChange={(e) => setFormState(prev => ({ ...prev, titulo: e.target.value }))}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                            placeholder="Ex: Instalação Elétrica - Edifício Comercial"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Validade do Orçamento *
                                        </label>
                                        <input
                                            type="date"
                                            value={formState.validade}
                                            onChange={(e) => setFormState(prev => ({ ...prev, validade: e.target.value }))}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Endereço da Obra (Rua e Número)
                                        </label>
                                        <input
                                            type="text"
                                            value={formState.enderecoObra}
                                            onChange={(e) => setFormState(prev => ({ ...prev, enderecoObra: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                            placeholder="Ex: Rua das Flores, 123"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Bairro
                                        </label>
                                        <input
                                            type="text"
                                            value={formState.bairro}
                                            onChange={(e) => setFormState(prev => ({ ...prev, bairro: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                            placeholder="Ex: Centro"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Cidade
                                        </label>
                                        <input
                                            type="text"
                                            value={formState.cidade}
                                            onChange={(e) => setFormState(prev => ({ ...prev, cidade: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                            placeholder="Ex: Florianópolis"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            CEP
                                        </label>
                                        <input
                                            type="text"
                                            value={formState.cep}
                                            onChange={(e) => setFormState(prev => ({ ...prev, cep: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                            placeholder="00000-000"
                                            maxLength={9}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Responsável no Local
                                        </label>
                                        <input
                                            type="text"
                                            value={formState.responsavelObra}
                                            onChange={(e) => setFormState(prev => ({ ...prev, responsavelObra: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                            placeholder="Nome do responsável técnico"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Descrição Resumida
                                        </label>
                                        <textarea
                                            value={formState.descricao}
                                            onChange={(e) => setFormState(prev => ({ ...prev, descricao: e.target.value }))}
                                            rows={2}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                            placeholder="Resumo breve do projeto..."
                                        />
                                    </div>
                                </div>

                                {/* SEÇÃO 2: Prazos e Cronograma */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">📅</span>
                                        Prazos e Cronograma
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Previsão de Início
                                            </label>
                                            <input
                                                type="date"
                                                value={formState.previsaoInicio}
                                                onChange={(e) => setFormState(prev => ({ ...prev, previsaoInicio: e.target.value }))}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Previsão de Término
                                            </label>
                                            <input
                                                type="date"
                                                value={formState.previsaoTermino}
                                                onChange={(e) => setFormState(prev => ({ ...prev, previsaoTermino: e.target.value }))}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* SEÇÃO 3: Itens do Orçamento */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-gray-800">Itens do Orçamento</h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowItemModal(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                            Adicionar Item
                                        </button>
                                    </div>

                                    {items.length === 0 ? (
                                        <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">📦</span>
                                            </div>
                                            <p className="text-gray-500 font-medium">Nenhum item adicionado</p>
                                            <p className="text-gray-400 text-sm mt-1">Clique em "Adicionar Item" para começar</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {items.map((item, index) => {
                                                const itemNome = getItemNome(item);
                                                const dataAtualizacao = getItemDataAtualizacaoCotacao(item);
                                                const isBancoFrio = isItemBancoFrio(item);
                                                const mostrarDescricao = shouldShowDescricao(item);

                                                return (
                                                    <div key={index} className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                                                            <div>
                                                                <p className="font-semibold text-gray-900">{itemNome}</p>
                                                                {mostrarDescricao && (
                                                                    <p className="text-sm text-gray-600 mt-1">{item.descricao}</p>
                                                                )}
                                                                <p className="text-sm text-gray-600">{item.unidadeMedida}</p>
                                                                {/* Flag de Banco Frio */}
                                                                {isBancoFrio && (
                                                                    <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium">
                                                                        <span>📦 Banco Frio</span>
                                                                        {dataAtualizacao ? (() => {
                                                                            const data = new Date(dataAtualizacao);
                                                                            if (!isNaN(data.getTime())) {
                                                                                return <span className="text-blue-600">• {data.toLocaleDateString('pt-BR')}</span>;
                                                                            }
                                                                            return <span className="text-blue-600">• Sem data</span>;
                                                                        })() : <span className="text-blue-600">• Sem data</span>}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade</label>
                                                                <input
                                                                    type="number"
                                                                    value={item.quantidade}
                                                                    onChange={(e) => handleUpdateItemQuantity(index, Number(e.target.value))}
                                                                    min="1"
                                                                    step="0.01"
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">Valor Unit.</label>
                                                                <p className="text-sm font-semibold text-gray-900">
                                                                    R$ {item.precoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">Subtotal</label>
                                                                <p className="text-sm font-bold text-purple-700">
                                                                    R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </p>
                                                            </div>

                                                            <div className="flex justify-end">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveItem(index)}
                                                                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                                                >
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Informação de Quantidade Total de Itens */}
                                            <div className="mt-6 py-4 bg-white border-2 border-gray-400 rounded-lg">
                                                <div className="text-center py-3">
                                                    <div className="border-t-2 border-gray-500 mb-3"></div>
                                                    <p className="text-xl font-bold text-gray-900">
                                                        Total de itens = {items.length} {items.length === 1 ? 'item' : 'itens'}
                                                    </p>
                                                    <div className="border-b-2 border-gray-500 mt-3"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* SEÇÃO 4: Cálculo Financeiro */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">💰</span>
                                        Cálculo Financeiro
                                    </h3>
                                    <div className="space-y-4">
                                        {/* Subtotal */}
                                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Subtotal dos Itens</span>
                                                <span className="text-xl font-bold text-blue-900 dark:text-blue-200">
                                                    R$ {calculosOrcamento.subtotalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Desconto e Impostos */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Desconto (R$)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={formState.descontoValor}
                                                    onChange={(e) => setFormState(prev => ({ ...prev, descontoValor: parseFloat(e.target.value) || 0 }))}
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                                    placeholder="0,00"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Impostos (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={formState.impostoPercentual}
                                                    onChange={(e) => setFormState(prev => ({ ...prev, impostoPercentual: parseFloat(e.target.value) || 0 }))}
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                                    placeholder="0"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Condição de Pagamento
                                                </label>
                                                <select
                                                    value={formState.condicaoPagamento}
                                                    onChange={(e) => setFormState(prev => ({ ...prev, condicaoPagamento: e.target.value }))}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                                >
                                                    <option value="À Vista">À Vista</option>
                                                    <option value="30 dias">30 dias</option>
                                                    <option value="30/60 dias">30/60 dias</option>
                                                    <option value="30/60/90 dias">30/60/90 dias</option>
                                                    <option value="Pagamento conforme condições a serem acordadas.">Pagamento conforme condições a serem acordadas.</option>
                                                    <option value="Personalizado">Personalizado</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Valor com Desconto */}
                                        {formState.descontoValor > 0 && (
                                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-semibold text-orange-700">Valor com Desconto</span>
                                                    <span className="text-xl font-bold text-orange-900">
                                                        R$ {calculosOrcamento.valorComDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* TOTAL FINAL */}
                                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 border-2 border-purple-300 dark:border-purple-700 p-6 rounded-xl">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <span className="text-lg font-semibold text-purple-700 dark:text-purple-300 uppercase">Valor Total Final</span>
                                                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
                                                        Subtotal - Desconto + Impostos
                                                    </p>
                                                </div>
                                                <span className="text-4xl font-bold text-purple-700 dark:text-purple-300">
                                                    R$ {calculosOrcamento.valorTotalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* SEÇÃO 5: Descrição Técnica com Editor Jodit WYSIWYG */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">📝</span>
                                        Descrição Técnica do Projeto
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        💡 Use o editor abaixo para criar ou editar a descrição técnica. Formate texto, insira imagens e crie tabelas.
                                    </p>

                                    {/* Editor Jodit WYSIWYG Inline - Lazy Load */}
                                    <div className="mb-4">
                                        {!shouldLoadEditor ? (
                                            <div className="w-full bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-dashed border-purple-300 rounded-xl p-12 flex flex-col items-center justify-center" style={{ minHeight: '400px' }}>
                                                <div className="relative mb-6">
                                                    <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-3xl animate-bounce">📝</span>
                                                    </div>
                                                </div>
                                                <h4 className="text-xl font-bold text-purple-800 mb-2 animate-pulse">
                                                    Carregando Editor WYSIWYG
                                                </h4>
                                                <p className="text-purple-600 text-center max-w-md">
                                                    Preparando o editor de texto rico com suporte a formatação, imagens e tabelas...
                                                </p>
                                                <div className="mt-4 flex gap-2">
                                                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                                </div>
                                            </div>
                                        ) : (
                                            <TechnicalEditor
                                                value={formState.descricaoProjeto}
                                                onChange={(content) => setFormState(prev => ({ ...prev, descricaoProjeto: content }))}
                                                placeholder="Digite a descrição técnica completa do projeto... Você pode formatar o texto, inserir imagens, criar tabelas e listas."
                                                height={800}
                                                showPagePreview={false}
                                            />
                                        )}
                                    </div>

                                    {/* Dica de Uso */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                        <p className="text-xs text-blue-800">
                                            💡 <strong>Dica:</strong> Use o ícone 🖼️ para inserir imagens inline e o ícone 📊 para criar tabelas de especificações.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-8 py-3 bg-[#0a1a2f] hover:bg-[#0d2240] text-white rounded-xl transition-all shadow-medium font-semibold"
                                    >
                                        {orcamentoToEdit ? 'Atualizar' : 'Criar'} Orçamento
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE SELEÇÃO DE ITENS - COM COMPARAÇÃO */}
            {showItemModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                    <div className={`bg-white dark:bg-dark-card rounded-2xl shadow-2xl ${modalExpandido ? 'max-w-[95vw] w-full' : 'max-w-4xl w-full'} max-h-[95vh] overflow-hidden flex flex-col transition-all duration-300`}>
                        {/* Header com Abas */}
                        <div className="p-6 border-b border-gray-200 dark:border-dark-border" style={{ backgroundColor: '#0a1a2f' }}>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white">Adicionar Item ao Orçamento</h3>
                                    <p className="text-sm text-white/80 mt-1">Escolha como deseja adicionar o item</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowItemModal(false);
                                        setItemSearchTerm('');
                                        setModoAdicao('materiais');
                                        setModalExpandido(false);
                                        setMaterialSelecionadoComparacao(null);
                                        setCotacaoSelecionadaComparacao(null);
                                        setMateriaisSelecionadosComparacao(new Set());
                                        setCotacoesSelecionadasComparacao(new Set());
                                        setSearchEstoque('');
                                        setSearchCotacoes('');
                                        setSearchGlobalComparacao('');
                                        setBuscaGlobal('');
                                        // Limpar todas as quantidades
                                        setQuantidadesMateriais(new Map());
                                        setQuantidadesServicos(new Map());
                                        setQuantidadesKits(new Map());
                                        setQuantidadesQuadros(new Map());
                                        setQuantidadesCotacoes(new Map());
                                    }}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Campo de Busca Universal no Header */}
                            {/* Campo de Busca Universal no Header */}
                            <div className="mb-4">
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/70" />
                                    <input
                                        type="text"
                                        value={buscaGlobal}
                                        onChange={(e) => setBuscaGlobal(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
                                        placeholder="🔍 Buscar em todos os itens (Materiais, Serviços, Kits, Quadros, Cotações)..."
                                        style={{ color: 'white' }}
                                    />
                                </div>
                            </div>

                            {/* Abas */}
                            <div className="flex gap-2 flex-wrap items-center">
                                <button
                                    type="button"
                                    onClick={() => setModoAdicao('materiais')}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${modoAdicao === 'materiais' && !buscaGlobal.trim()
                                            ? 'bg-white text-indigo-700'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                        }`}
                                >
                                    📦 Materiais
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModoAdicao('servicos')}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${modoAdicao === 'servicos'
                                            ? 'bg-white text-indigo-700'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                        }`}
                                >
                                    🔧 Serviços
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModoAdicao('kits')}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${modoAdicao === 'kits'
                                            ? 'bg-white text-indigo-700'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                        }`}
                                >
                                    📦 Kits
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModoAdicao('quadros')}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${modoAdicao === 'quadros'
                                            ? 'bg-white text-indigo-700'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                        }`}
                                >
                                    ⚡ Quadros
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModoAdicao('cotacoes')}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${modoAdicao === 'cotacoes'
                                            ? 'bg-white text-indigo-700'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                        }`}
                                >
                                    🏷️ Cotações
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModoAdicao('manual')}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${modoAdicao === 'manual'
                                            ? 'bg-white text-indigo-700'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                        }`}
                                >
                                    ✏️ Manual
                                </button>
                            </div>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Resultados da Busca Global - Layout lado a lado quando expandido */}
                            {buscaGlobal.trim() && (
                                <div className={`mb-6 ${modalExpandido ? 'grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto' : 'space-y-4'}`}>
                                    {/* Materiais */}
                                    {resultadosBuscaGlobal.materiais.length > 0 && (
                                        <div className={modalExpandido ? 'bg-gray-50 dark:bg-slate-800 p-4 rounded-lg' : ''}>
                                            <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2 flex items-center gap-2">
                                                <span>📦</span> Materiais ({resultadosBuscaGlobal.materiais.length})
                                            </h4>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {resultadosBuscaGlobal.materiais.map(material => {
                                                    const quantidadeAtual = quantidadesMateriais.get(material.id) || 1;
                                                    return (
                                                        <div
                                                            key={material.id}
                                                            className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex-1">
                                                                    <p className="font-semibold text-gray-900 dark:text-dark-text">{material.nome}</p>
                                                                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                                                                        SKU: {material.sku} • Estoque: {material.estoque} {material.unidadeMedida}
                                                                        <br />
                                                                        Custo: R$ {(material.preco ?? 0).toFixed(2)}
                                                                        {material.valorVenda && (
                                                                            <> • Venda: R$ {(material.valorVenda ?? 0).toFixed(2)}
                                                                                {material.porcentagemLucro && ` (${(material.porcentagemLucro ?? 0).toFixed(2)}% lucro)`}
                                                                            </>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Qtd:</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={quantidadeAtual}
                                                                        onChange={(e) => {
                                                                            const qtd = parseInt(e.target.value) || 1;
                                                                            atualizarQuantidadeMaterial(material.id, qtd);
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddItem(material, true, quantidadeAtual)}
                                                                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-md hover:bg-indigo-700 transition-colors"
                                                                    >
                                                                        Inserir
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Serviços */}
                                    {resultadosBuscaGlobal.servicos.length > 0 && (
                                        <div className={modalExpandido ? 'bg-gray-50 dark:bg-slate-800 p-4 rounded-lg' : ''}>
                                            <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2 flex items-center gap-2">
                                                <span>🔧</span> Serviços ({resultadosBuscaGlobal.servicos.length})
                                            </h4>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {resultadosBuscaGlobal.servicos.map(servico => {
                                                    const quantidadeAtual = quantidadesServicos.get(servico.id) || 1;
                                                    return (
                                                        <div
                                                            key={servico.id}
                                                            className="w-full text-left p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                                                        >
                                                            <div className="flex justify-between items-start gap-3">
                                                                <div className="flex-1">
                                                                    <p className="font-semibold text-gray-900 dark:text-dark-text">{servico.nome}</p>
                                                                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                                                                        Código: {servico.codigo || 'N/A'} • Preço: R$ {(servico.preco ?? 0).toFixed(2)}/{servico.unidade || 'un'}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Qtd:</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={quantidadeAtual}
                                                                        onChange={(e) => {
                                                                            const qtd = parseInt(e.target.value) || 1;
                                                                            atualizarQuantidadeServico(servico.id, qtd);
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddServico(servico, true, quantidadeAtual)}
                                                                        className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors"
                                                                    >
                                                                        Inserir
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Kits */}
                                    {resultadosBuscaGlobal.kits.length > 0 && (
                                        <div className={modalExpandido ? 'bg-gray-50 dark:bg-slate-800 p-4 rounded-lg' : ''}>
                                            <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2 flex items-center gap-2">
                                                <span>📦</span> Kits ({resultadosBuscaGlobal.kits.length})
                                            </h4>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {resultadosBuscaGlobal.kits.map(kit => {
                                                    const quantidadeAtual = quantidadesKits.get(kit.id) || 1;
                                                    return (
                                                        <div
                                                            key={kit.id}
                                                            className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-700 transition-all"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex-1">
                                                                    <p className="font-semibold text-gray-900 dark:text-dark-text">{kit.nome}</p>
                                                                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                                                                        {kit.items?.length || 0} itens • Preço: R$ {((kit.precoSugerido ?? kit.custoTotal) ?? 0).toFixed(2)}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Qtd:</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={quantidadeAtual}
                                                                        onChange={(e) => {
                                                                            const qtd = parseInt(e.target.value) || 1;
                                                                            atualizarQuantidadeKit(kit.id, qtd);
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddKit(kit, true, quantidadeAtual)}
                                                                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-md hover:bg-green-700 transition-colors"
                                                                    >
                                                                        Inserir
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Quadros */}
                                    {resultadosBuscaGlobal.quadros.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2 flex items-center gap-2">
                                                <span>⚡</span> Quadros ({resultadosBuscaGlobal.quadros.length})
                                            </h4>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {resultadosBuscaGlobal.quadros.map(quadro => {
                                                    const quantidadeAtual = quantidadesQuadros.get(quadro.id) || 1;
                                                    return (
                                                        <div
                                                            key={quadro.id}
                                                            className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700 transition-all"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex-1">
                                                                    <p className="font-semibold text-gray-900 dark:text-dark-text">{quadro.nome}</p>
                                                                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                                                                        Custo: R$ {(quadro.custoTotal ?? 0).toFixed(2)} • Preço: R$ {((quadro.precoSugerido ?? quadro.custoTotal) ?? 0).toFixed(2)}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Qtd:</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={quantidadeAtual}
                                                                        onChange={(e) => {
                                                                            const qtd = parseInt(e.target.value) || 1;
                                                                            atualizarQuantidadeQuadro(quadro.id, qtd);
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddQuadro(quadro, true, quantidadeAtual)}
                                                                        className="px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-md hover:bg-amber-700 transition-colors"
                                                                    >
                                                                        Inserir
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Cotações */}
                                    {resultadosBuscaGlobal.cotacoes.length > 0 && (
                                        <div className={modalExpandido ? 'bg-gray-50 dark:bg-slate-800 p-4 rounded-lg' : ''}>
                                            <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2 flex items-center gap-2">
                                                <span>🏷️</span> Cotações - Banco Frio ({resultadosBuscaGlobal.cotacoes.length})
                                            </h4>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {resultadosBuscaGlobal.cotacoes.map(cotacao => {
                                                    const quantidadeAtual = quantidadesCotacoes.get(cotacao.id) || 1;
                                                    const temSelecaoUnidade = podeVenderEmMetroOuCm(cotacao.unidadeMedida);

                                                    // Calcular valores para exibição
                                                    const custoUnitario = cotacao.valorUnitario || 0;
                                                    const valorVendaBase = cotacao.valorVenda || custoUnitario;
                                                    const porcentagemLucro = custoUnitario > 0
                                                        ? ((valorVendaBase - custoUnitario) / custoUnitario) * 100
                                                        : 0;
                                                    const unidadeMedida = cotacao.unidadeMedida || 'UN';

                                                    return (
                                                        <div
                                                            key={cotacao.id}
                                                            className="w-full text-left p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                                                        >
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-semibold">
                                                                    📦 Banco Frio
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between items-start gap-3">
                                                                <div className="flex-1">
                                                                    <p className="font-semibold text-gray-900 dark:text-dark-text">{cotacao.nome}</p>
                                                                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                                                                        NCM: {cotacao.ncm || 'N/A'} • Fornecedor: {cotacao.fornecedorNome || 'N/A'}
                                                                        <br />
                                                                        Custo: R$ {custoUnitario.toFixed(2)}/{unidadeMedida}
                                                                        {valorVendaBase > 0 && (
                                                                            <> • Venda: R$ {valorVendaBase.toFixed(2)}/{unidadeMedida}
                                                                                {porcentagemLucro > 0 && ` (${porcentagemLucro.toFixed(2)}% lucro)`}
                                                                            </>
                                                                        )}
                                                                    </p>
                                                                    {temSelecaoUnidade && (
                                                                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                                                            💡 Metros ou cm
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Qtd:</label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={quantidadeAtual}
                                                                        onChange={(e) => {
                                                                            const qtd = parseInt(e.target.value) || 1;
                                                                            atualizarQuantidadeCotacao(cotacao.id, qtd);
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                                    />
                                                                    {temSelecaoUnidade ? (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleAddCotacao(cotacao, true, 'm', quantidadeAtual)}
                                                                                className="px-2 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors"
                                                                                title="Adicionar em metros"
                                                                            >
                                                                                + m
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleAddCotacao(cotacao, true, 'cm', quantidadeAtual)}
                                                                                className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                                                                                title="Adicionar em centímetros"
                                                                            >
                                                                                + cm
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleAddCotacao(cotacao, true, undefined, quantidadeAtual)}
                                                                            className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors"
                                                                        >
                                                                            Inserir
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Nenhum resultado */}
                                    {Object.values(resultadosBuscaGlobal).every(arr => arr.length === 0) && (
                                        <div className={`text-center py-8 bg-gray-50 dark:bg-slate-800 rounded-xl ${modalExpandido ? 'col-span-2' : ''}`}>
                                            <p className="text-gray-500 dark:text-dark-text-secondary">Nenhum item encontrado para "{buscaGlobal}"</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Materiais */}
                            {!buscaGlobal.trim() && modoAdicao === 'materiais' && (
                                <div>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={itemSearchTerm}
                                            onChange={(e) => setItemSearchTerm(e.target.value)}
                                            className="input-field"
                                            placeholder="🔍 Buscar material por nome ou SKU..."
                                        />
                                    </div>

                                    {filteredMaterials.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">📦</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhum material encontrado</p>
                                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">Tente ajustar a busca ou criar manualmente</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredMaterials.map(material => {
                                                const quantidadeAtual = quantidadesMateriais.get(material.id) || 1;
                                                return (
                                                    <div
                                                        key={material.id}
                                                        className="w-full p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1">
                                                                <p className="font-semibold text-gray-900 dark:text-dark-text">{material.nome}</p>
                                                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                                    SKU: {material.sku} • Estoque: {material.estoque} {material.unidadeMedida}
                                                                    <br />
                                                                    Custo: R$ {(material.preco ?? 0).toFixed(2)}
                                                                    {material.valorVenda && (
                                                                        <> • Venda: R$ {(material.valorVenda ?? 0).toFixed(2)}
                                                                            {material.porcentagemLucro && ` (${(material.porcentagemLucro ?? 0).toFixed(2)}% lucro)`}
                                                                        </>
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <label className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Qtd:</label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={quantidadeAtual}
                                                                    onChange={(e) => {
                                                                        const qtd = parseInt(e.target.value) || 1;
                                                                        atualizarQuantidadeMaterial(material.id, qtd);
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAddItem(material, false, quantidadeAtual)}
                                                                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-md hover:bg-indigo-700 transition-colors"
                                                                >
                                                                    Inserir
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Serviços */}
                            {!buscaGlobal.trim() && modoAdicao === 'servicos' && (
                                <div>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={itemSearchTerm}
                                            onChange={(e) => setItemSearchTerm(e.target.value)}
                                            className="input-field"
                                            placeholder="🔍 Buscar serviço por nome ou código..."
                                        />
                                    </div>

                                    {filteredServicos.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">🔧</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhum serviço encontrado</p>
                                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">Cadastre serviços na página de Serviços</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredServicos.map(servico => (
                                                <button
                                                    key={servico.id}
                                                    type="button"
                                                    onClick={() => handleAddServico(servico)}
                                                    className="w-full text-left p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                                                >
                                                    <p className="font-semibold text-gray-900 dark:text-dark-text">{servico.nome}</p>
                                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                        Código: {servico.codigo || 'N/A'} • Tipo: {servico.tipo || 'N/A'} • Preço: R$ {(servico.preco ?? 0).toFixed(2)}/{servico.unidade || 'un'}
                                                    </p>
                                                    {servico.descricao && (
                                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">{servico.descricao}</p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Kits */}
                            {!buscaGlobal.trim() && modoAdicao === 'kits' && (
                                <div>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={itemSearchTerm}
                                            onChange={(e) => setItemSearchTerm(e.target.value)}
                                            className="input-field"
                                            placeholder="🔍 Buscar kit por nome..."
                                        />
                                    </div>

                                    {filteredKits.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">📦</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhum kit disponível</p>
                                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">
                                                A funcionalidade de kits será implementada em breve
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredKits.map(kit => (
                                                <button
                                                    key={kit.id}
                                                    type="button"
                                                    onClick={() => handleAddKit(kit)}
                                                    className="w-full text-left p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-700 transition-all"
                                                >
                                                    <p className="font-semibold text-gray-900 dark:text-dark-text">{kit.nome}</p>
                                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                        {kit.items.length} itens • Custo Total: R$ {kit.custoTotal.toFixed(2)} • Preço: R$ {(kit.precoSugerido || kit.custoTotal).toFixed(2)}
                                                    </p>
                                                    {kit.descricao && (
                                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">{kit.descricao}</p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Quadros */}
                            {!buscaGlobal.trim() && modoAdicao === 'quadros' && (
                                <div>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={itemSearchTerm}
                                            onChange={(e) => setItemSearchTerm(e.target.value)}
                                            className="input-field"
                                            placeholder="🔍 Buscar quadro por nome..."
                                        />
                                    </div>

                                    {filteredQuadros.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">⚡</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhum quadro encontrado</p>
                                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">
                                                Monte quadros no módulo de Catálogo
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredQuadros.map(quadro => (
                                                <button
                                                    key={quadro.id}
                                                    type="button"
                                                    onClick={() => handleAddQuadro(quadro)}
                                                    className="w-full text-left p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700 transition-all"
                                                >
                                                    <p className="font-semibold text-gray-900 dark:text-dark-text">{quadro.nome}</p>
                                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                        Custo: R$ {(quadro.custoTotal ?? 0).toFixed(2)} • Preço: R$ {((quadro.precoSugerido ?? quadro.custoTotal) ?? 0).toFixed(2)}
                                                    </p>
                                                    {quadro.descricao && (
                                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">{quadro.descricao}</p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Cotações (Banco Frio) */}
                            {!buscaGlobal.trim() && modoAdicao === 'cotacoes' && (
                                <div>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={itemSearchTerm}
                                            onChange={(e) => setItemSearchTerm(e.target.value)}
                                            className="input-field"
                                            placeholder="🔍 Buscar cotação por nome, NCM ou fornecedor..."
                                        />
                                    </div>

                                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg mb-4">
                                        <p className="text-sm text-blue-800 dark:text-blue-300">
                                            📦 <strong>Banco Frio:</strong> Materiais cotados com fornecedores, sem necessidade de estoque físico.
                                        </p>
                                    </div>

                                    {filteredCotacoes.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">🏷️</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhuma cotação encontrada</p>
                                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">
                                                Cadastre cotações na página de Cotações
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredCotacoes.map(cotacao => (
                                                <button
                                                    key={cotacao.id}
                                                    type="button"
                                                    onClick={() => handleAddCotacao(cotacao)}
                                                    className="w-full text-left p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-gray-900 dark:text-dark-text">{cotacao.nome}</p>
                                                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                                NCM: {cotacao.ncm || 'N/A'} • Fornecedor: {cotacao.fornecedorNome || 'N/A'}
                                                            </p>
                                                            {cotacao.observacoes && (
                                                                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">{cotacao.observacoes}</p>
                                                            )}
                                                        </div>
                                                        <div className="text-right ml-4">
                                                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                                                R$ {cotacao.valorUnitario.toFixed(2)}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                                                                Atualizado em {new Date(cotacao.dataAtualizacao).toLocaleDateString('pt-BR')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Criar Manualmente */}
                            {!buscaGlobal.trim() && modoAdicao === 'manual' && (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg mb-6">
                                        <p className="text-sm text-blue-800 dark:text-blue-300">
                                            💡 <strong>Dica:</strong> Use esta opção para adicionar materiais/serviços que ainda não foram comprados.
                                            Ideal para orçamentos baseados em cotações de fornecedores.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                Tipo de Item
                                            </label>
                                            <select
                                                value={novoItemManual.tipo}
                                                onChange={(e) => setNovoItemManual(prev => ({ ...prev, tipo: e.target.value as any }))}
                                                className="select-field"
                                            >
                                                <option value="MATERIAL">Material</option>
                                                <option value="SERVICO">Serviço</option>
                                                <option value="KIT">Kit</option>
                                                <option value="CUSTO_EXTRA">Custo Extra</option>
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                Nome/Descrição do Item
                                            </label>
                                            <input
                                                type="text"
                                                value={novoItemManual.nome}
                                                onChange={(e) => setNovoItemManual(prev => ({ ...prev, nome: e.target.value }))}
                                                className="input-field"
                                                placeholder="Ex: Disjuntor 32A Tripolar, Instalação de Quadro, etc."
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                Descrição Técnica (Opcional)
                                            </label>
                                            <textarea
                                                value={novoItemManual.descricao}
                                                onChange={(e) => setNovoItemManual(prev => ({ ...prev, descricao: e.target.value }))}
                                                rows={2}
                                                className="textarea-field"
                                                placeholder="Detalhes técnicos, especificações, normas..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                Unidade de Medida
                                            </label>
                                            <select
                                                value={novoItemManual.unidadeMedida}
                                                onChange={(e) => setNovoItemManual(prev => ({ ...prev, unidadeMedida: e.target.value }))}
                                                className="select-field"
                                            >
                                                <option value="UN">Unidade (UN)</option>
                                                <option value="M">Metro (M)</option>
                                                <option value="M²">Metro Quadrado (M²)</option>
                                                <option value="M³">Metro Cúbico (M³)</option>
                                                <option value="KG">Quilograma (KG)</option>
                                                <option value="L">Litro (L)</option>
                                                <option value="CX">Caixa (CX)</option>
                                                <option value="PC">Peça (PC)</option>
                                                <option value="SERV">Serviço (SERV)</option>
                                                <option value="HR">Hora (HR)</option>
                                                <option value="VERBA">Verba (VERBA)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                Quantidade
                                            </label>
                                            <input
                                                type="number"
                                                value={novoItemManual.quantidade}
                                                onChange={(e) => setNovoItemManual(prev => ({ ...prev, quantidade: parseFloat(e.target.value) || 0 }))}
                                                min="0.01"
                                                step="0.01"
                                                className="input-field"
                                                placeholder="0"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                Custo Unitário (R$)
                                            </label>
                                            <input
                                                type="number"
                                                value={novoItemManual.custoUnit}
                                                onChange={(e) => setNovoItemManual(prev => ({ ...prev, custoUnit: parseFloat(e.target.value) || 0 }))}
                                                min="0"
                                                step="0.01"
                                                className="input-field"
                                                placeholder="0,00"
                                            />
                                            <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-2">
                                                💡 Digite o custo/preço unitário do material ou serviço.
                                            </p>
                                        </div>

                                        {/* Preview do Cálculo */}
                                        {novoItemManual.custoUnit > 0 && novoItemManual.quantidade > 0 && (
                                            <div className="md:col-span-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-600 dark:text-dark-text-secondary mb-1">Custo Total</p>
                                                        <p className="text-lg font-bold text-gray-900 dark:text-dark-text">
                                                            R$ {(novoItemManual.custoUnit * novoItemManual.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600 dark:text-dark-text-secondary mb-1">Preço Unitário</p>
                                                        <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                                                            R$ {novoItemManual.custoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600 dark:text-dark-text-secondary mb-1">Preço Total</p>
                                                        <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                                            R$ {(novoItemManual.custoUnit * novoItemManual.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-dark-border flex justify-between items-center gap-3">
                            <div className="flex-1 flex items-center gap-3">
                                {/* Botão para inserir todos os itens com quantidades definidas */}
                                {(() => {
                                    const totalItensComQuantidade =
                                        Array.from(quantidadesMateriais.values()).filter(q => q > 0).length +
                                        Array.from(quantidadesServicos.values()).filter(q => q > 0).length +
                                        Array.from(quantidadesKits.values()).filter(q => q > 0).length +
                                        Array.from(quantidadesQuadros.values()).filter(q => q > 0).length +
                                        Array.from(quantidadesCotacoes.values()).filter(q => q > 0).length;

                                    return totalItensComQuantidade > 0 ? (
                                        <button
                                            type="button"
                                            onClick={handleInserirItensComQuantidades}
                                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-600 transition-all shadow-medium font-semibold flex items-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Inserir {totalItensComQuantidade} Item(ns) com Quantidades
                                        </button>
                                    ) : null;
                                })()}

                                {/* Botão para inserção múltipla quando há itens selecionados via checkbox */}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowItemModal(false);
                                        setItemSearchTerm('');
                                        setModoAdicao('materiais');
                                        setModalExpandido(false);
                                        setMaterialSelecionadoComparacao(null);
                                        setCotacaoSelecionadaComparacao(null);
                                        setMateriaisSelecionadosComparacao(new Set());
                                        setCotacoesSelecionadasComparacao(new Set());
                                        setSearchEstoque('');
                                        setSearchCotacoes('');
                                        setSearchGlobalComparacao('');
                                        setBuscaGlobal('');
                                        // Limpar todas as quantidades
                                        setQuantidadesMateriais(new Map());
                                        setQuantidadesServicos(new Map());
                                        setQuantidadesKits(new Map());
                                        setQuantidadesQuadros(new Map());
                                        setQuantidadesCotacoes(new Map());
                                        setNovoItemManual({
                                            nome: '',
                                            descricao: '',
                                            unidadeMedida: 'UN',
                                            quantidade: 1,
                                            custoUnit: 0,
                                            tipo: 'MATERIAL'
                                        });
                                    }}
                                    className="btn-secondary"
                                >
                                    Cancelar
                                </button>
                                {modoAdicao === 'manual' && (
                                    <button
                                        type="button"
                                        onClick={handleAddItemManual}
                                        className="btn-primary flex items-center gap-2"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                        Adicionar Item
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE VISUALIZAÇÃO */}
            {orcamentoToView && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-7xl w-full max-h-[95vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-blue-700">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Detalhes do Orçamento</h2>
                                <p className="text-sm text-blue-100 mt-1">Visualização completa do orçamento</p>
                            </div>
                            <button onClick={() => setOrcamentoToView(null)} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Informações Básicas */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">📋</span>
                                    Informações Básicas
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-dark-border">
                                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Cliente</h4>
                                        <p className="text-gray-900 dark:text-dark-text font-medium">{orcamentoToView.cliente?.nome || 'N/A'}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-dark-border">
                                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Status</h4>
                                        <span className={`inline-block px-3 py-1.5 text-xs font-bold rounded-lg ${getStatusClass(orcamentoToView.status)}`}>
                                            {orcamentoToView.status === 'Pendente' && '⏳ '}
                                            {orcamentoToView.status === 'Enviado ao Cliente' && '📤 '}
                                            {orcamentoToView.status === 'Aprovado' && '✅ '}
                                            {orcamentoToView.status === 'Recusado' && '❌ '}
                                            {orcamentoToView.status === 'Declinado' && '🔻 '}
                                            {orcamentoToView.status === 'Cancelado' && '🚫 '}
                                            {orcamentoToView.status}
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-dark-border">
                                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Pedido de Venda</h4>
                                        {orcamentoToView.venda?.numeroSequencial ? (
                                            <p className="text-gray-900 dark:text-dark-text font-medium">#{orcamentoToView.venda.numeroSequencial}</p>
                                        ) : (
                                            <p className="text-gray-500 dark:text-gray-400 font-medium">Não gerado</p>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-dark-border">
                                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Data de Criação</h4>
                                        <p className="text-gray-900 dark:text-dark-text font-medium">
                                            {new Date(orcamentoToView.createdAt).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                    {orcamentoToView.numeroSequencial && (
                                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-dark-border">
                                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Número do Orçamento</h4>
                                            <p className="text-gray-900 dark:text-dark-text font-medium">#{orcamentoToView.numeroSequencial}</p>
                                        </div>
                                    )}
                                    {orcamentoToView.empresaCNPJ && (
                                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-dark-border">
                                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Empresa Executora</h4>
                                            <p className="text-gray-900 dark:text-dark-text font-medium">
                                                {(() => {
                                                    const cnpjNorm = (orcamentoToView.empresaCNPJ || '').replace(/\D/g, '');
                                                    const emp = empresasFiscais.find(ef => (ef.cnpj || '').replace(/\D/g, '') === cnpjNorm);
                                                    return emp ? (emp.nomeFantasia || emp.razaoSocial || orcamentoToView.empresaCNPJ) : orcamentoToView.empresaCNPJ;
                                                })()}
                                            </p>
                                        </div>
                                    )}
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-xl border-2 border-purple-300 dark:border-purple-700">
                                        <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase mb-1 flex items-center gap-1">
                                            <span>👤</span> Orçamento Gerado Por
                                        </h4>
                                        <p className="text-purple-900 dark:text-purple-300 font-bold text-lg">{orcamentoToView.orcamentistaNome || 'Não identificado'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Endereço da Obra */}
                            {(orcamentoToView.enderecoObra || orcamentoToView.cidade || orcamentoToView.bairro || orcamentoToView.cep) && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">🏗️</span>
                                        Endereço da Obra
                                    </h3>
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {orcamentoToView.enderecoObra && (
                                                <div>
                                                    <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">Endereço</h4>
                                                    <p className="text-gray-900 dark:text-white font-medium">{orcamentoToView.enderecoObra}</p>
                                                </div>
                                            )}
                                            {orcamentoToView.bairro && (
                                                <div>
                                                    <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">Bairro</h4>
                                                    <p className="text-gray-900 dark:text-white font-medium">{orcamentoToView.bairro}</p>
                                                </div>
                                            )}
                                            {orcamentoToView.cidade && (
                                                <div>
                                                    <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">Cidade</h4>
                                                    <p className="text-gray-900 dark:text-white font-medium">{orcamentoToView.cidade}</p>
                                                </div>
                                            )}
                                            {orcamentoToView.cep && (
                                                <div>
                                                    <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">CEP</h4>
                                                    <p className="text-gray-900 dark:text-white font-medium">{orcamentoToView.cep}</p>
                                                </div>
                                            )}
                                            {orcamentoToView.responsavelObra && (
                                                <div className="md:col-span-2">
                                                    <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">Responsável pela Obra</h4>
                                                    <p className="text-gray-900 dark:text-white font-medium">{orcamentoToView.responsavelObra}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Descrição */}
                            {orcamentoToView.descricao && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">📝</span>
                                        Descrição
                                    </h3>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{orcamentoToView.descricao}</p>
                                    </div>
                                </div>
                            )}

                            {/* Itens do Orçamento */}
                            {orcamentoToView.items && orcamentoToView.items.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">📦</span>
                                        Itens do Orçamento ({orcamentoToView.items.length})
                                    </h3>
                                    <div className="border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-dark-border">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Produto</th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Unid.</th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Qtd</th>
                                                        <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Custo Unit.</th>
                                                        <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Venda Unit.</th>
                                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
                                                    {orcamentoToView.items.map((item: any, index: number) => {
                                                        const itemNome = getItemNome(item);
                                                        const dataAtualizacao = getItemDataAtualizacaoCotacao(item);
                                                        const isBancoFrio = isItemBancoFrio(item);
                                                        const mostrarDescricao = shouldShowDescricao(item);
                                                        const tipo = item.tipo || 'Material';
                                                        const unidadeBruta = item.unidadeVenda || item.unidadeMedida || 'UN';
                                                        const unidade = formatarUnidadeOrcamento(unidadeBruta);
                                                        const quantidade = item.quantidade || 0;
                                                        const custoUnit = item.custoUnit || item.custoUnitario || 0;
                                                        const precoUnit = item.precoUnit || item.precoUnitario || 0;
                                                        const subtotal = item.subtotal || (precoUnit * quantidade);

                                                        return (
                                                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div>
                                                                        <p className="font-semibold text-gray-900 dark:text-dark-text text-sm">{itemNome}</p>
                                                                        {mostrarDescricao && item.descricao && (
                                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.descricao}</p>
                                                                        )}
                                                                        {isBancoFrio && (
                                                                            <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg text-xs font-medium">
                                                                                <span>📦 Banco Frio</span>
                                                                                {dataAtualizacao ? (() => {
                                                                                    const data = new Date(dataAtualizacao);
                                                                                    if (!isNaN(data.getTime())) {
                                                                                        return <span className="text-blue-600 dark:text-blue-400">• {data.toLocaleDateString('pt-BR')}</span>;
                                                                                    }
                                                                                    return <span className="text-blue-600 dark:text-blue-400">• Sem data</span>;
                                                                                })() : <span className="text-blue-600 dark:text-blue-400">• Sem data</span>}
                                                                            </div>
                                                                        )}
                                                                        {(item as any).vendaDiretaFornecedor && (
                                                                            <div className="mt-2 inline-flex items-center px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-lg text-xs font-medium" title="Não entra em contas a receber, estoque nem NF-e">
                                                                                Venda direta fornecedor
                                                                            </div>
                                                                        )}
                                                                        {/* Botão para ver itens do kit customizado */}
                                                                        {tipo === 'KIT' && (() => {
                                                                            // Verificar se tem itensDoKit (pode ser array ou objeto JSON)
                                                                            const itensDoKit = item.itensDoKit;
                                                                            const temItensDoKit = itensDoKit && (
                                                                                (Array.isArray(itensDoKit) && itensDoKit.length > 0) ||
                                                                                (typeof itensDoKit === 'object' && Object.keys(itensDoKit).length > 0)
                                                                            );

                                                                            if (!temItensDoKit) return null;

                                                                            const itensArray = Array.isArray(itensDoKit) ? itensDoKit : [itensDoKit];

                                                                            return (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        e.stopPropagation();
                                                                                        setItensKitParaVisualizar(itensArray);
                                                                                        setNomeKitParaVisualizar(itemNome);
                                                                                        setShowModalItensKit(true);
                                                                                    }}
                                                                                    className="mt-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 rounded-md transition-colors"
                                                                                >
                                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                                    </svg>
                                                                                    Ver itens do kit ({itensArray.length})
                                                                                </button>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 text-center">
                                                                    <span className="text-gray-700 dark:text-dark-text font-medium text-sm">{tipo}</span>
                                                                </td>
                                                                <td className="px-4 py-4 text-center">
                                                                    <span className="text-gray-700 dark:text-dark-text font-medium text-sm">{unidade}</span>
                                                                </td>
                                                                <td className="px-4 py-4 text-center">
                                                                    <span className="text-gray-700 dark:text-dark-text font-medium">{quantidade}</span>
                                                                </td>
                                                                <td className="px-4 py-4 text-right">
                                                                    <span className="text-gray-700 dark:text-dark-text font-medium">
                                                                        R$ {custoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-4 text-right">
                                                                    <span className="text-gray-700 dark:text-dark-text font-medium">
                                                                        R$ {precoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <span className="font-bold text-blue-700 dark:text-blue-400 text-base">
                                                                        R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Totais */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">💰</span>
                                    Totais
                                </h3>
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-300 dark:border-blue-700 p-6 rounded-xl space-y-3">
                                    {(() => {
                                        const subtotalItens = (orcamentoToView.items || []).reduce((s: number, it: any) => s + (Number(it.subtotal) || 0), 0);
                                        const desconto = Number(orcamentoToView.descontoValor) || 0;
                                        const valorFinal = Number(orcamentoToView.precoVenda) || 0;
                                        const totalVendaDireta = (orcamentoToView.items || [])
                                            .filter((it: any) => Boolean(it.vendaDiretaFornecedor))
                                            .reduce((s: number, it: any) => s + (Number(it.subtotal) || 0), 0);
                                        const valorEmpresaRecebe = Math.max(0, valorFinal - totalVendaDireta);
                                        return (
                                            <>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Valor do orçamento (subtotal dos itens)</span>
                                                    <span className="text-lg font-semibold text-blue-800 dark:text-blue-200">R$ {subtotalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                                {desconto > 0 && (
                                                    <div className="flex justify-between items-center text-amber-700 dark:text-amber-400">
                                                        <span className="text-sm font-medium">Desconto</span>
                                                        <span className="text-lg font-semibold">- R$ {desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                )}
                                                {totalVendaDireta > 0 && (
                                                    <div className="flex justify-between items-center text-blue-800 dark:text-blue-300">
                                                        <span className="text-sm font-semibold">Valor total do orçamento</span>
                                                        <span className="text-lg font-bold text-blue-900 dark:text-blue-200">
                                                            R$ {valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center pt-2 border-t-2 border-blue-300 dark:border-blue-600">
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 uppercase">
                                                            {totalVendaDireta > 0 ? 'Valor final do orçamento (empresa)' : 'Valor final do orçamento'}
                                                        </h4>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                                            {totalVendaDireta > 0
                                                                ? 'Valor que entra para a empresa (exclui itens de venda direta)'
                                                                : `Subtotal ${desconto > 0 ? '- Desconto' : ''} (+ impostos se houver)`}
                                                        </p>
                                                    </div>
                                                    <p className="text-4xl font-bold text-blue-700 dark:text-blue-400">
                                                        R$ {(totalVendaDireta > 0 ? valorEmpresaRecebe : valorFinal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Observações */}
                            {orcamentoToView.observacoes && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">💬</span>
                                        Observações
                                    </h3>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{orcamentoToView.observacoes}</p>
                                    </div>
                                </div>
                            )}

                            {orcamentoToView.venda?.id && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">🧪</span>
                                        Referência Técnica (DEV)
                                    </h3>
                                    <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 p-4 rounded-xl">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">UUID do Pedido de Venda</p>
                                        <p className="text-sm font-mono text-slate-800 dark:text-slate-200 break-all">{orcamentoToView.venda.id}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Rodapé com Ações */}
                        <div className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-dark-border">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                {/* Status Atual */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${orcamentoToView.status === 'Aprovado' ? 'bg-green-500' :
                                                orcamentoToView.status === 'Pendente' ? 'bg-yellow-500' :
                                                    orcamentoToView.status === 'Enviado ao Cliente' ? 'bg-blue-500' :
                                                        orcamentoToView.status === 'Declinado' ? 'bg-gray-900' :
                                                            orcamentoToView.status === 'Cancelado' ? 'bg-gray-500' :
                                                                'bg-red-500'
                                            }`}></div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Status: <strong>{orcamentoToView.status}</strong>
                                        </span>
                                    </div>
                                </div>

                                {/* Botões de Ação */}
                                <div className="flex gap-3 flex-wrap">
                                    {orcamentoToView.status === 'Pendente' && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    handleChangeStatus(orcamentoToView.id, 'Enviado ao Cliente');
                                                    setOrcamentoToView(null);
                                                }}
                                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                </svg>
                                                Enviado ao Cliente
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleAprovarOrcamento(orcamentoToView.id);
                                                    setOrcamentoToView(null);
                                                }}
                                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Aprovar
                                            </button>
                                        </>
                                    )}
                                    {orcamentoToView.status === 'Enviado ao Cliente' && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    handleAprovarOrcamento(orcamentoToView.id);
                                                    setOrcamentoToView(null);
                                                }}
                                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Aprovar
                                            </button>
                                            <button
                                                onClick={() => handleDeclinarOrcamento(orcamentoToView, true)}
                                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-700 transition-all shadow-medium font-semibold"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                                Declinar
                                            </button>
                                        </>
                                    )}
                                    {orcamentoToView.status === 'Aprovado' && !orcamentoToView.venda?.id && !orcamentoToView.pedidoFaturado && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    // Navegar para página de vendas com orçamento pré-selecionado
                                                    navigate('/vendas', { state: { orcamentoId: orcamentoToView.id } });
                                                    setOrcamentoToView(null);
                                                }}
                                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                                                </svg>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                                                </svg>
                                                Gerar Pedido de Venda
                                            </button>
                                            <button
                                                onClick={() => handleDeclinarOrcamento(orcamentoToView, true)}
                                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-medium font-semibold"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                                Declinar
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={async () => {
                                            // Copiar orçamento
                                            const orcData = orcamentoToView;
                                            const itemsMapeados = mapItensOrcamentoParaCopia(orcData.items || []);

                                            const orcamentoCopia = {
                                                empresaCNPJ: orcData.empresaCNPJ,
                                                titulo: orcData.titulo,
                                                descricao: orcData.descricao,
                                                descricaoProjeto: orcData.descricaoProjeto,
                                                validade: orcData.validade,
                                                endereco: orcData.enderecoObra,
                                                bairro: orcData.bairro,
                                                cidade: orcData.cidade,
                                                cep: orcData.cep,
                                                responsavelObra: orcData.responsavelObra,
                                                bdi: orcData.bdi,
                                                previsaoInicio: orcData.previsaoInicio,
                                                previsaoTermino: orcData.previsaoTermino,
                                                condicaoPagamento: orcData.condicaoPagamento,
                                                items: itemsMapeados
                                            };
                                            localStorage.setItem('orcamentoCopia', JSON.stringify(orcamentoCopia));
                                            toast.success('Orçamento copiado', {
                                                description: 'Abrindo novo orçamento...'
                                            });
                                            setOrcamentoToView(null);
                                            setAbaAtiva('novo');
                                        }}
                                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Copiar Orçamento
                                    </button>
                                    <button
                                        onClick={() => setOrcamentoToView(null)}
                                        className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-semibold"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Customização de PDF */}
            {showPDFCustomization && orcamentoForPDF && (
                <PDFCustomizationModal
                    isOpen={showPDFCustomization}
                    onClose={() => {
                        setShowPDFCustomization(false);
                        setOrcamentoForPDF(null);
                    }}
                    orcamentoId={orcamentoForPDF.id}
                    orcamentoData={prepararDadosParaPDF(orcamentoForPDF)}
                    onGeneratePDF={() => {
                        console.log('✅ PDF gerado com sucesso!');
                        toast.success('PDF personalizado gerado com sucesso!');
                        // Fechar modal após gerar (opcional)
                        setShowPDFCustomization(false);
                        setOrcamentoForPDF(null);
                    }}
                />
            )}

            {/* Modal de Preview de Importação */}
            {modalPreviewImportOpen && dadosParaImportar && orcamentoToView && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-blue-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                        <DocumentArrowUpIcon className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">Preview de Importação</h3>
                                        <p className="text-gray-900 dark:text-white font-medium">{orcamentoToView.cliente?.nome || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                                        <span>📊</span>
                                        Status
                                    </h3>
                                    <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${getStatusClass(orcamentoToView.status)}`}>
                                        {orcamentoToView.status === 'Pendente' && '⏳ '}
                                        {orcamentoToView.status === 'Enviado ao Cliente' && '📤 '}
                                        {orcamentoToView.status === 'Aprovado' && '✅ '}
                                        {orcamentoToView.status === 'Recusado' && '❌ '}
                                        {orcamentoToView.status === 'Declinado' && '🔻 '}
                                        {orcamentoToView.status === 'Cancelado' && '🚫 '}
                                        {orcamentoToView.status}
                                    </span>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                                        <span>💰</span>
                                        Total
                                    </h3>
                                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">R$ {orcamentoToView.precoVenda?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}</p>
                                </div>
                                {/* Validade - mostrar como histórico se aprovado */}
                                {orcamentoToView.status === 'Aprovado' ? (
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl">
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                                            <span>✅</span>
                                            Aprovado
                                        </h3>
                                        {orcamentoToView.aprovedAt && (
                                            <p className="text-gray-900 dark:text-white font-medium mb-2">
                                                Data de Aprovação: {new Date(orcamentoToView.aprovedAt).toLocaleDateString('pt-BR')}
                                            </p>
                                        )}
                                        <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                                            <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-1">
                                                📅 Validade Original (Dado Histórico):
                                            </p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                                {new Date(orcamentoToView.validade ?? orcamentoToView.createdAt ?? Date.now()).toLocaleDateString('pt-BR')}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                                ⚠️ Este orçamento foi aprovado. A validade original é mantida apenas como registro histórico.
                                                Os preços e condições estão congelados na data de aprovação.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                                            <span>📅</span>
                                            Validade
                                        </h3>
                                        <p className="text-gray-900 dark:text-white font-medium">{new Date(orcamentoToView.validade ?? orcamentoToView.createdAt ?? Date.now()).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                )}
                            </div>

                            {/* Data de Geração */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                                    <span>📋</span>
                                    Data de Geração do Orçamento
                                </h3>
                                <p className="text-gray-900 dark:text-white font-medium">
                                    {orcamentoToView.createdAt
                                        ? new Date(orcamentoToView.createdAt).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                        : 'Data não disponível'}
                                </p>
                            </div>

                            {/* Endereço da Obra */}
                            {(orcamentoToView.enderecoObra || orcamentoToView.cidade || orcamentoToView.bairro || orcamentoToView.cep) && (
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                                        <span>🏗️</span>
                                        Endereço da Obra
                                    </h3>
                                    <div className="space-y-2">
                                        {orcamentoToView.enderecoObra && (
                                            <p className="text-gray-900 dark:text-white">
                                                <span className="font-semibold">Endereço:</span> {orcamentoToView.enderecoObra}
                                            </p>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {orcamentoToView.bairro && (
                                                <p className="text-gray-900 dark:text-white">
                                                    <span className="font-semibold">Bairro:</span> {orcamentoToView.bairro}
                                                </p>
                                            )}
                                            {orcamentoToView.cidade && (
                                                <p className="text-gray-900 dark:text-white">
                                                    <span className="font-semibold">Cidade:</span> {orcamentoToView.cidade}
                                                </p>
                                            )}
                                            {orcamentoToView.cep && (
                                                <p className="text-gray-900 dark:text-white">
                                                    <span className="font-semibold">CEP:</span> {orcamentoToView.cep}
                                                </p>
                                            )}
                                        </div>
                                        {orcamentoToView.responsavelObra && (
                                            <p className="text-gray-900 dark:text-white mt-2">
                                                <span className="font-semibold">Responsável pela Obra:</span> {orcamentoToView.responsavelObra}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {orcamentoToView.descricao && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                                        <span>📝</span>
                                        Descrição
                                    </h3>
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{orcamentoToView.descricao}</p>
                                </div>
                            )}

                            {orcamentoToView.items && orcamentoToView.items.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-4">Itens do Orçamento</h3>
                                    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                                        <div className="overflow-x-auto max-h-[420px]">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Produto</th>
                                                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo</th>
                                                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Unid.</th>
                                                        <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Qtd</th>
                                                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Custo Unit.</th>
                                                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Venda Unit.</th>
                                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-100">
                                                    {orcamentoToView.items.map((item: any, index: number) => {
                                                        const itemNome = getItemNome(item);
                                                        const dataAtualizacao = getItemDataAtualizacaoCotacao(item);
                                                        const isBancoFrio = isItemBancoFrio(item);
                                                        const mostrarDescricao = shouldShowDescricao(item);
                                                        const tipo = getItemTipo(item);
                                                        const unidadeBruta = item.unidadeVenda || item.unidadeMedida || 'UN';
                                                        const unidade = formatarUnidadeOrcamento(unidadeBruta);
                                                        const quantidade = item.quantidade || 0;
                                                        const custoUnit = item.custoUnit || item.custo || 0;
                                                        const precoVendaUnit = item.precoUnit || item.precoUnitario || 0;
                                                        const subtotal = item.subtotal || quantidade * precoVendaUnit;

                                                        return (
                                                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-4 py-3 align-top">
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <p className="font-semibold text-gray-900">{itemNome}</p>
                                                                            {isBancoFrio && (
                                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                                                                                    ❄️ Banco Frio
                                                                                </span>
                                                                            )}
                                                                            {(item as any).vendaDiretaFornecedor && (
                                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800" title="Não entra em contas a receber, estoque nem NF-e">
                                                                                    Venda direta fornecedor
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {mostrarDescricao && (
                                                                            <p className="text-xs text-gray-600">{item.descricao}</p>
                                                                        )}
                                                                        {dataAtualizacao && (
                                                                            <p className="text-[10px] text-gray-400">
                                                                                Última cotação: {new Date(dataAtualizacao).toLocaleDateString('pt-BR')}
                                                                            </p>
                                                                        )}
                                                                        {/* Botão para ver itens do kit customizado */}
                                                                        {tipo === 'KIT' && item.itensDoKit && Array.isArray(item.itensDoKit) && item.itensDoKit.length > 0 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    setItensKitParaVisualizar(item.itensDoKit);
                                                                                    setNomeKitParaVisualizar(itemNome);
                                                                                    setShowModalItensKit(true);
                                                                                }}
                                                                                className="mt-1 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
                                                                            >
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                                </svg>
                                                                                Ver itens do kit ({item.itensDoKit.length})
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-3 text-center align-top text-xs font-medium text-gray-700">
                                                                    {tipo === 'MATERIAL' && 'Material'}
                                                                    {tipo === 'COTACAO' && 'Banco Frio'}
                                                                    {tipo === 'KIT' && 'Kit'}
                                                                    {tipo === 'SERVICO' && 'Serviço'}
                                                                    {tipo === 'QUADRO_PRONTO' && 'Quadro'}
                                                                    {tipo === 'CUSTO_EXTRA' && 'Custo Extra'}
                                                                </td>
                                                                <td className="px-3 py-3 text-center align-top text-xs text-gray-700">
                                                                    {unidade}
                                                                </td>
                                                                <td className="px-3 py-3 text-center align-top text-xs font-semibold text-gray-900">
                                                                    {quantidade}
                                                                </td>
                                                                <td className="px-3 py-3 text-right align-top text-xs text-gray-700">
                                                                    R$ {custoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </td>
                                                                <td className="px-3 py-3 text-right align-top text-xs font-semibold text-gray-900">
                                                                    R$ {precoVendaUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </td>
                                                                <td className="px-4 py-3 text-right align-top">
                                                                    <span className="text-sm font-bold text-purple-700">
                                                                        R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {orcamentoToView.observacoes && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                                        <span>💬</span>
                                        Observações
                                    </h3>
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{orcamentoToView.observacoes}</p>
                                </div>
                            )}

                            {/* Ações do Orçamento */}
                            <div className="flex gap-3 pt-6 border-t border-gray-100">
                                <button
                                    onClick={() => {
                                        if (orcamentoToView) {
                                            const orcamentoCopy = orcamentoToView;
                                            setOrcamentoToView(null);
                                            handlePersonalizarPDF(orcamentoCopy);
                                        }
                                    }}
                                    className="btn-success flex items-center gap-2"
                                    title="Personalizar PDF com logo e folha timbrada"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                                    </svg>
                                    🎨 Personalizar PDF
                                </button>
                                {orcamentoToView.status === 'Pendente' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                handleChangeStatus(orcamentoToView.id, 'Enviado ao Cliente');
                                                setOrcamentoToView(null);
                                            }}
                                            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2.5 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                                        >
                                            📤 Enviado ao Cliente
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleAprovarOrcamento(orcamentoToView.id);
                                                setOrcamentoToView(null);
                                            }}
                                            className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-2.5 rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                                        >
                                            ✅ Aprovar Orçamento
                                        </button>
                                    </>
                                )}
                                {orcamentoToView.status === 'Enviado ao Cliente' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                handleAprovarOrcamento(orcamentoToView.id);
                                                setOrcamentoToView(null);
                                            }}
                                            className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-2.5 rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                                        >
                                            ✅ Aprovar Orçamento
                                        </button>
                                        <button
                                            onClick={() => handleDeclinarOrcamento(orcamentoToView, true)}
                                            className="flex-1 bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-2.5 rounded-xl hover:from-gray-800 hover:to-gray-700 transition-all shadow-medium font-semibold"
                                        >
                                            🔻 Declinar
                                        </button>
                                    </>
                                )}
                                {orcamentoToView.status === 'Aprovado' && (
                                    <button
                                        onClick={() => handleDeclinarOrcamento(orcamentoToView, true)}
                                        className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 text-white px-4 py-2.5 rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-medium font-semibold"
                                    >
                                        🔻 Declinar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Preview de Importação */}
            {modalPreviewImportOpen && dadosParaImportar && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-blue-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                        <DocumentArrowUpIcon className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">Preview de Importação</h3>
                                        <p className="text-sm text-blue-100 mt-1">
                                            {dadosParaImportar.orcamentos.length} orçamento(s) para importar
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
                                            {dadosParaImportar.orcamentos.length}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-green-700 dark:text-green-400">Válidos:</p>
                                        <p className="text-lg font-bold text-green-900 dark:text-green-300">
                                            {dadosParaImportar.orcamentos.filter(o => !o.errosOrcamento || o.errosOrcamento.length === 0).length}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-red-700 dark:text-red-400">Com Erros:</p>
                                        <p className="text-lg font-bold text-red-900 dark:text-red-300">
                                            {dadosParaImportar.orcamentos.filter(o => o.errosOrcamento && o.errosOrcamento.length > 0).length}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Lista de Orçamentos */}
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-dark-text mb-3">📋 Orçamentos para Importar</h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100 dark:bg-gray-800">
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                    Título
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                    Cliente
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                    Validade
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                    Itens
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dadosParaImportar.orcamentos.map((orcamento, index) => {
                                                const temErros = orcamento.errosOrcamento && orcamento.errosOrcamento.length > 0;
                                                return (
                                                    <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${temErros ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                            {orcamento.titulo || 'Sem título'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                            {orcamento.clienteNome || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                            {orcamento.validade ? new Date(orcamento.validade).toLocaleDateString('pt-BR') : 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                            {(orcamento.items || []).length} item(s)
                                                        </td>
                                                        <td className="px-4 py-3 text-sm border border-gray-300 dark:border-gray-600">
                                                            {temErros ? (
                                                                <div className="text-red-600 dark:text-red-400">
                                                                    <p className="font-semibold">❌ Erros</p>
                                                                    <ul className="text-xs mt-1">
                                                                        {orcamento.errosOrcamento.map((erro: string, i: number) => (
                                                                            <li key={i}>• {erro}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            ) : (
                                                                <span className="text-green-600 dark:text-green-400 font-semibold">✅ Válido</span>
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
                                disabled={importing || dadosParaImportar.orcamentos.filter(o => !o.errosOrcamento || o.errosOrcamento.length === 0).length === 0}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

            {/* AlertDialog de Confirmação de Aprovação */}
            <AlertDialog
                isOpen={showAprovarDialog}
                onClose={() => {
                    setShowAprovarDialog(false);
                    setOrcamentoToAprovar(null);
                }}
                onConfirm={handleConfirmarAprovacao}
                title={`Aprovar orçamento #${orcamentoToAprovar?.numeroSequencial || orcamentoToAprovar?.id?.substring(0, 8) || 'N/A'}?`}
                message="Esta ação permitirá criar projetos/obras a partir deste orçamento."
                confirmText="Confirmar Aprovação"
                cancelText="Cancelar"
                variant="success"
            />

            <ModalItensKit
                open={showModalItensKit}
                onClose={() => {
                    setShowModalItensKit(false);
                    setItensKitParaVisualizar([]);
                    setNomeKitParaVisualizar('');
                }}
                itens={itensKitParaVisualizar}
                nomeKit={nomeKitParaVisualizar}
                empresas={empresas}
                empresaCNPJ={orcamentoToView?.empresaCNPJ || formState.empresaCNPJ}
            />

            {/* AlertDialog de Confirmação de Declínio */}
            <AlertDialog
                isOpen={showDeclinarDialog}
                onClose={() => {
                    setShowDeclinarDialog(false);
                    setOrcamentoToDeclinar(null);
                }}
                onConfirm={handleConfirmarDeclinio}
                title={`Tem certeza que deseja declinar o orçamento #${orcamentoToDeclinar?.numeroSequencial || orcamentoToDeclinar?.id?.substring(0, 8) || 'N/A'}?`}
                message="O orçamento será marcado como declinado."
                confirmText="Sim, declinar"
                cancelText="Cancelar"
                variant="warning"
            />

            {/* AlertDialog de Confirmação de Exclusão */}
            <AlertDialog
                isOpen={showDeleteDialog}
                onClose={() => {
                    setShowDeleteDialog(false);
                    setOrcamentoToDelete(null);
                    setDeletePermanent(false);
                }}
                onConfirm={handleDeleteOrcamento}
                title={deletePermanent
                    ? `Excluir permanentemente orçamento #${orcamentoToDelete?.numeroSequencial || orcamentoToDelete?.id?.substring(0, 8) || 'N/A'}?`
                    : `Cancelar orçamento #${orcamentoToDelete?.numeroSequencial || orcamentoToDelete?.id?.substring(0, 8) || 'N/A'}?`}
                message={deletePermanent
                    ? `Tem certeza que deseja excluir permanentemente o orçamento "${orcamentoToDelete?.titulo}"? Esta ação não pode ser desfeita e removerá o registro do banco de dados.`
                    : `Tem certeza que deseja cancelar o orçamento "${orcamentoToDelete?.titulo}"? O orçamento será marcado como cancelado.`}
                confirmText={deletePermanent ? "Excluir Permanentemente" : "Cancelar Orçamento"}
                cancelText="Voltar"
                variant={deletePermanent ? "danger" : "warning"}
            />
        </div>
    );
};

export default Orcamentos;