import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import { CircleDollarSign, ShoppingCart, Receipt, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AuthContext } from '../contexts/AuthContext';
import { BudgetStatus } from '../types';
import { vendasService, type Venda, type DashboardVendas } from '../services/vendasService';
import { orcamentosService } from '../services/orcamentosService';
import { clientesService } from '../services/clientesService';
import { pdfCustomizationService } from '../services/pdfCustomizationService';
import { empresaFiscalService, type EmpresaFiscal } from '../services/empresaFiscalService';
import { nfeFiscalService } from '../services/nfeFiscalService';
import { getUploadUrl } from '../config/api';
import { configuracoesService, type MetaVendasSistema } from '../services/configuracoesService';
import ContractPDFViewer from './PDFCustomization/ContractPDFViewer';
import AlertDialog from './ui/AlertDialog';
import ActionsDropdown from './ui/ActionsDropdown';
import { calcularValorAReceberDoOrcamento, calcularValorVendaDiretaDoOrcamento } from '../utils/orcamentoValorAReceber';
import ParcelasVendaAuditoriaTable from './financeiro/ParcelasVendaAuditoriaTable';
import { canDelete } from '../utils/permissions';
import {
    AlertDialog as AlertDialogShadcn,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './ui/alert-dialog';

import { useEscapeKey } from '../hooks/useEscapeKey';
import {
    generateExampleTemplate,
    exportToJSON,
    readJSONFile,
    validateImportData,
    type VendaTemplate,
    type ImportExportData,
} from '../utils/importExportTemplates';
const TechnicalEditor = lazy(() => import('./TechnicalEditor').then(m => ({ default: m.default })));

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
/** Material Symbol done_all — confirmação / registrar pedido */
const DoneAllIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
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
const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
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
const PrinterIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-1.036-.84-1.875-1.875-1.875H11.25c-1.036 0-1.875.84-1.875 1.875v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
    </svg>
);

/** Borda esquerda no primeiro <td> da lista de vendas (padrão Compras/Orçamentos; collapse em <tr> não confiável). */
function getVendaRowLateralBorderClass(statusExibicao: string): string {
    switch (statusExibicao) {
        case 'Pendente':
            return 'border-l-4 border-blue-600';
        case 'Pago Parcial':
            return 'border-l-4 border-yellow-400';
        case 'Concluida':
            return 'border-l-4 border-green-600';
        case 'Faturado':
            return 'border-l-4 border-orange-500';
        case 'Cancelada':
            return 'border-l-4 border-red-500';
        default:
            return 'border-l-4 border-gray-300 dark:border-gray-600';
    }
}

interface VendasProps {
    toggleSidebar: () => void;
    onNavigate?: (path?: string) => void;
}

interface VendaForm {
    orcamentoId?: string;
    formaPagamento: string;
    parcelas: number;
    valorEntrada: number;
    /** true = parcelas iguais; false = usuário define valor de cada parcela (última = restante) */
    parcelasIguais: boolean;
    /** Valores manuais por parcela (quando parcelasIguais = false). Última parcela é sempre calculada como restante. */
    valoresParcelas?: number[];
    observacoes?: string;
    dataPrimeiraParcela: string;
    /** Boleto integral: data única para cobrança (padrão: hoje) */
    dataCobrancaBoleto?: string;
    /** Boleto parcelado: uma data por parcela (obrigatório) */
    datasParcelas?: string[];
}

type TabType = 'nova' | 'lista' | 'dashboard' | 'config' | 'ajuda';

function yyyymmMesCorrente(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const Vendas: React.FC<VendasProps> = ({ toggleSidebar, onNavigate }) => {
    const auth = useContext(AuthContext);
    const user = auth?.user ?? null;
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    
    const [metaVendasSistema, setMetaVendasSistema] = useState<MetaVendasSistema | null>(null);
    const [carregandoMetaVendas, setCarregandoMetaVendas] = useState(true);
    const [mesMetaConfig, setMesMetaConfig] = useState<string>(() => yyyymmMesCorrente());
    const [valorMetaForm, setValorMetaForm] = useState(100000);
    const [salvandoMetaVendas, setSalvandoMetaVendas] = useState(false);

    const metaMensal = metaVendasSistema?.valorEfetivo ?? 100000;

    const roleLower = user?.role?.toLowerCase?.() ?? '';
    const podeEditarMetaVendas = roleLower === 'admin' || roleLower === 'desenvolvedor';

    const recarregarMetaVendas = async () => {
        const res = await configuracoesService.getMetaVendas();
        if (res.success && res.data) {
            setMetaVendasSistema(res.data);
            return res.data;
        }
        return null;
    };

    useEffect(() => {
        try {
            localStorage.removeItem('vendas_meta_mensal');
        } catch {
            /* ignore */
        }
        let ativo = true;
        (async () => {
            setCarregandoMetaVendas(true);
            const dados = await recarregarMetaVendas();
            if (!ativo) return;
            if (dados) {
                setMesMetaConfig(dados.mesAtual);
            }
            setCarregandoMetaVendas(false);
        })();
        return () => {
            ativo = false;
        };
    }, []);

    useEffect(() => {
        if (!metaVendasSistema) return;
        const v = metaVendasSistema.porMes[mesMetaConfig];
        setValorMetaForm(typeof v === 'number' && !Number.isNaN(v) ? v : metaVendasSistema.padrao);
    }, [metaVendasSistema, mesMetaConfig]);

    // Data de hoje em YYYY-MM-DD para padrão de boleto
    const hojeISO = () => new Date().toISOString().split('T')[0];

    // Estados para nova venda
    const [vendaForm, setVendaForm] = useState<VendaForm>({
        orcamentoId: '',
        formaPagamento: 'À vista',
        parcelas: 1,
        valorEntrada: 0,
        parcelasIguais: true,
        valoresParcelas: [],
        observacoes: '',
        dataPrimeiraParcela: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dataCobrancaBoleto: hojeISO(),
        datasParcelas: [],
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
    const [empresasFiscais, setEmpresasFiscais] = useState<EmpresaFiscal[]>([]);

    // Estados para modal de visualização
    const [vendaParaVisualizar, setVendaParaVisualizar] = useState<Venda | null>(null);
    const [modalVisualizarVenda, setModalVisualizarVenda] = useState(false);
    const [detalhesVenda, setDetalhesVenda] = useState<any>(null);
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);
    const [uploadContratoLoading, setUploadContratoLoading] = useState(false);
    const inputContratoRef = useRef<HTMLInputElement>(null);

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

    // Estados para criação de kit na página de vendas
    const [itensSelecionadosVenda, setItensSelecionadosVenda] = useState<Set<number>>(new Set());
    const [showCriarKitModalVenda, setShowCriarKitModalVenda] = useState(false);
    const [nomeKitVenda, setNomeKitVenda] = useState('');
    const [ncmKitVenda, setNcmKitVenda] = useState('');
    const [itensOrcamentoModificados, setItensOrcamentoModificados] = useState<any[] | null>(null);
    // Modal ver itens do kit unificado (botão olho)
    const [showModalItensKitVenda, setShowModalItensKitVenda] = useState(false);
    const [itensKitParaVisualizarVenda, setItensKitParaVisualizarVenda] = useState<any[]>([]);
    const [nomeKitParaVisualizarVenda, setNomeKitParaVisualizarVenda] = useState('');

    // Estados para exclusão
    const [vendaToDelete, setVendaToDelete] = useState<Venda | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Estados para modal de edição (parcelas + NCM)
    const [vendaParaEditar, setVendaParaEditar] = useState<any | null>(null);
    const [modalEditarVendaOpen, setModalEditarVendaOpen] = useState(false);
    const [loadingEditarVenda, setLoadingEditarVenda] = useState(false);
    const [savingEditarVenda, setSavingEditarVenda] = useState(false);

    // Estados para emissão NF-e: escolha (integral vs fracionado) e formulário fracionado
    const [vendaEmitirEscolha, setVendaEmitirEscolha] = useState<any | null>(null);
    const [modalEmitirEscolhaOpen, setModalEmitirEscolhaOpen] = useState(false);
    const [emitirModalStep, setEmitirModalStep] = useState<'escolha' | 'fracionado'>('escolha');
    const [fracoesFaturamento, setFracoesFaturamento] = useState<Array<{ clienteId: string; clienteNome: string; valor: number; dataVencimento: string }>>([]);
    const [buscaClienteFracionado, setBuscaClienteFracionado] = useState('');
    const [clientesFracionadoLista, setClientesFracionadoLista] = useState<any[]>([]);
    const [loadingClientesFracionado, setLoadingClientesFracionado] = useState(false);
    const [empresaFiscalIdFracionado, setEmpresaFiscalIdFracionado] = useState('');
    const [ambienteFracionado, setAmbienteFracionado] = useState<'1' | '2'>('2');
    const [enviandoFracionado, setEnviandoFracionado] = useState(false);
    const buscaClienteFracionadoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Estados para Lista de Vendas (busca e filtro)
    const [listSearchTerm, setListSearchTerm] = useState('');
    const [listStatusFilter, setListStatusFilter] = useState<string>('Todos');

    // Modal Gerar Contrato (editor padrão orçamento + template/variáveis)
    const [modalContratoOpen, setModalContratoOpen] = useState(false);
    const [conteudoContrato, setConteudoContrato] = useState('');
    const [activeTabContrato, setActiveTabContrato] = useState<'design' | 'preview'>('design');
    /** ID da venda quando o modal foi aberto a partir dos detalhes (permite Salvar Alterações) */
    const [contratoVendaId, setContratoVendaId] = useState<string | null>(null);
    /** Tipo do contrato aberto no modal (apenas subestação usa gap menor nas assinaturas) */
    const [tipoContratoModal, setTipoContratoModal] = useState<'simplificado' | 'subestacao' | null>(null);
    /** Folha timbrada para o PDF do contrato (URL da imagem de fundo) */
    const [folhaTimbradaContratoUrl, setFolhaTimbradaContratoUrl] = useState<string | null>(null);
    const [folhasTimbradasContrato, setFolhasTimbradasContrato] = useState<Array<{ filename: string; url: string; size?: number; createdAt?: string; modifiedAt?: string }>>([]);
    const [loadingFolhasContrato, setLoadingFolhasContrato] = useState(false);
    const [uploadingFolhaContrato, setUploadingFolhaContrato] = useState(false);
    const [contratoInsertToken, setContratoInsertToken] = useState<number>(0);
    const [contratoInsertText, setContratoInsertText] = useState<string>('');
    const printContratoRef = useRef<HTMLDivElement>(null);
    const printContratoDetalhesRef = useRef<HTMLDivElement>(null);
    const previewContratoScrollRef = useRef<HTMLDivElement>(null);
    const editorRefContrato = useRef<any>(null);
    const [showModalVisualizarContratoDetalhes, setShowModalVisualizarContratoDetalhes] = useState(false);
    const [refreshPreviewContrato, setRefreshPreviewContrato] = useState(0);

    /** Divide o HTML do contrato em páginas A4.
     * Regras:
     * 1) Se o conteúdo tiver `<div class="page-break">`, estas quebras manuais são PRIORITÁRIAS e viram limites fixos de página.
     * 2) Se não houver page-break manual, aplica limite aproximado de caracteres, quebrando em blocos “seguros”.
     */
    const dividirConteudoContratoEmPaginas = useMemo(() => {
        // Sem limite máximo de páginas (pode gerar 10, 15 ou mais conforme o conteúdo).
        const LIMITE_CARACTERES_POR_PAGINA = 2000; // 12pt, margens A4 → ~1 folha; valor menor = mais páginas para contratos longos (ex.: subestação)
        const SAFE_BREAK = /<\/(?:p|div|h[1-6]|li|tr|ul|ol)>|\s+/gi;

        function splitLongSegment(seg: string, maxChars: number): string[] {
            const textLen = seg.replace(/<[^>]*>/g, '').length || seg.length;
            if (textLen <= maxChars) return [seg];
            const parts: string[] = [];
            let rest = seg;
            while (rest.length > 0) {
                const restTextLen = rest.replace(/<[^>]*>/g, '').length || rest.length;
                if (restTextLen <= maxChars) {
                    parts.push(rest);
                    break;
                }
                let cut = Math.min(maxChars, rest.length);
                const slice = rest.slice(0, cut + 300);
                let lastSafe = -1;
                const re = new RegExp(SAFE_BREAK.source, 'gi');
                let m;
                while ((m = re.exec(slice)) !== null) {
                    if (m.index + m[0].length <= cut) lastSafe = m.index + m[0].length;
                }
                if (lastSafe > 0) cut = lastSafe;
                parts.push(rest.slice(0, cut).trim());
                rest = rest.slice(cut).trim();
            }
            return parts.filter(p => p.length > 0);
        }

        return (html: string): string[] => {
            if (!html || typeof html !== 'string') return [''];
            const trimmed = html.trim();
            if (!trimmed) return [''];

            // 1) Respeitar quebra manual vinda do editor (TipTap → <div class="page-break"></div>)
            const pageBreakRegex = /<div[^>]*class=["']page-break["'][^>]*>\s*<\/div>/gi;
            if (pageBreakRegex.test(trimmed)) {
                const partesManuais = trimmed.split(pageBreakRegex).map(p => p.trim()).filter(Boolean);
                return partesManuais.length > 0 ? partesManuais : [trimmed];
            }

            // 2) Sem page-break manual → usar algoritmo de limite aproximado
            const paginas: string[] = [];
            const regex = /<\/(?:p|div|h[1-6]|li|tr|ul|ol)>/gi;
            let lastIndex = 0;
            let paginaAtual = '';
            let caracteresNaPagina = 0;
            let match;
            const segmentos: string[] = [];
            while ((match = regex.exec(trimmed)) !== null) {
                segmentos.push(trimmed.slice(lastIndex, match.index + match[0].length));
                lastIndex = match.index + match[0].length;
            }
            if (lastIndex < trimmed.length) segmentos.push(trimmed.slice(lastIndex));
            if (segmentos.length === 0) return [trimmed];
            for (const seg of segmentos) {
                const textoLimpo = seg.replace(/<[^>]*>/g, '');
                const tamanho = textoLimpo.length || seg.length;
                if (tamanho > LIMITE_CARACTERES_POR_PAGINA) {
                    if (paginaAtual.trim()) {
                        paginas.push(paginaAtual.trim());
                        paginaAtual = '';
                        caracteresNaPagina = 0;
                    }
                    const subPartes = splitLongSegment(seg, LIMITE_CARACTERES_POR_PAGINA);
                    for (const parte of subPartes) {
                        paginas.push(parte);
                    }
                    continue;
                }
                if (caracteresNaPagina > 0 && caracteresNaPagina + tamanho > LIMITE_CARACTERES_POR_PAGINA) {
                    if (paginaAtual.trim()) paginas.push(paginaAtual.trim());
                    paginaAtual = '';
                    caracteresNaPagina = 0;
                }
                paginaAtual += seg;
                caracteresNaPagina += tamanho;
            }
            if (paginaAtual.trim()) paginas.push(paginaAtual.trim());
            return paginas.length > 0 ? paginas : [trimmed || ''];
        };
    }, []);

    const paginasContrato = useMemo(() => {
        const html = typeof conteudoContrato === 'string' ? conteudoContrato : '';
        return dividirConteudoContratoEmPaginas(html);
    }, [conteudoContrato, dividirConteudoContratoEmPaginas]);

    const handlePrintContrato = useReactToPrint({
        contentRef: printContratoRef,
        documentTitle: `Contrato_${new Date().toISOString().split('T')[0]}`,
        pageStyle: `
            @page { size: A4; margin: 95px 0 80px 0; }
            @media print {
                * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                body { margin: 0; padding: 0; }
                .no-print { display: none !important; }
                .contrato-print-container .pdf-page { margin: 0; box-shadow: none; page-break-after: always; break-after: page; }
                .contrato-print-container .pdf-page:last-child { page-break-after: auto; break-after: auto; }
                .contrato-print-container .page-content { padding-top: 95px !important; padding-bottom: 100px !important; padding-left: 60px !important; padding-right: 60px !important; }
                .contrato-print-container .watermark-background.custom-letterhead { position: fixed !important; width: 210mm; height: 297mm; background-size: 210mm 297mm !important; background-position: top left !important; background-repeat: no-repeat !important; }
            }
        `
    });

    const handlePrintContratoDetalhes = useReactToPrint({
        contentRef: printContratoDetalhesRef,
        documentTitle: `Contrato_Venda_${detalhesVenda?.id?.slice(0, 8) || ''}_${new Date().toISOString().split('T')[0]}`,
        pageStyle: `
            @page { size: A4; margin: 95px 0 80px 0; }
            @media print {
                * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                body { margin: 0; padding: 0; }
                .no-print { display: none !important; }
                .contrato-print-container .pdf-page { margin: 0; box-shadow: none; page-break-after: always; break-after: page; }
                .contrato-print-container .pdf-page:last-child { page-break-after: auto; break-after: auto; }
                .contrato-print-container .page-content { padding-top: 95px !important; padding-bottom: 100px !important; padding-left: 60px !important; padding-right: 60px !important; }
                .contrato-print-container .watermark-background.custom-letterhead { position: fixed !important; width: 210mm; height: 297mm; background-size: 210mm 297mm !important; background-position: top left !important; background-repeat: no-repeat !important; }
            }
        `
    });

    // Carregar dados iniciais
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('🔍 Carregando dados de vendas...');
            
            const [vendasRes, orcamentosRes, dashboardRes, empresasFiscaisRes] = await Promise.all([
                vendasService.listarVendas({ limit: 1000 }), // ✅ ERP: mostrar até 1000 itens por página
                orcamentosService.listar({ status: 'Aprovado' }),
                vendasService.getDashboard(),
                empresaFiscalService.listar().catch(() => ({ success: false, data: [] }))
            ]);

            console.log('📊 Resposta do serviço - Vendas:', vendasRes);
            console.log('📋 Resposta do serviço - Orçamentos:', orcamentosRes);
            console.log('📈 Resposta do serviço - Dashboard:', dashboardRes);

            // Tratar vendas
            if (vendasRes.success && vendasRes.data) {
                setVendas(vendasRes.data.vendas || []);
                console.log(`✅ ${vendasRes.data.vendas?.length || 0} vendas carregadas`);
            } else {
                console.warn('⚠️ Erro ao carregar vendas:', (vendasRes as any).error);
                setVendas([]);
            }

            // Tratar orçamentos aprovados
            if (orcamentosRes.success && orcamentosRes.data) {
                // Validação adicional: garantir que apenas orçamentos com status "Aprovado" sejam exibidos
                const orcamentosFiltrados = Array.isArray(orcamentosRes.data) 
                    ? orcamentosRes.data.filter((orc: any) => {
                        const status = orc.status?.toString() || '';
                        return status === 'Aprovado' || 
                               status === 'APROVADO' ||
                               status.toLowerCase() === 'aprovado';
                      })
                    : [];
                setOrcamentosAprovados(orcamentosFiltrados);
                if (orcamentosFiltrados.length < (Array.isArray(orcamentosRes.data) ? orcamentosRes.data.length : 0)) {
                    console.warn(`⚠️ Filtrados ${(Array.isArray(orcamentosRes.data) ? orcamentosRes.data.length : 0) - orcamentosFiltrados.length} orçamentos sem status "Aprovado"`);
                }
                console.log(`✅ ${orcamentosFiltrados.length} orçamentos aprovados carregados`);
            } else {
                console.warn('⚠️ Erro ao carregar orçamentos:', (orcamentosRes as any).error);
                setOrcamentosAprovados([]);
            }

            // Tratar dashboard
            if (dashboardRes.success && dashboardRes.data) {
                setDashboardData(dashboardRes.data);
                console.log('✅ Dashboard de vendas carregado');
            } else {
                console.warn('⚠️ Erro ao carregar dashboard:', (dashboardRes as any).error);
                setDashboardData(null);
            }

            // Empresas fiscais (CNPJ/endereço S3E para contrato)
            if (empresasFiscaisRes?.data && Array.isArray(empresasFiscaisRes.data)) {
                setEmpresasFiscais(empresasFiscaisRes.data);
            } else {
                setEmpresasFiscais([]);
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

    // Set de orcamentoIds que já possuem venda (para desabilitar seleção)
    const orcamentosComVendaIds = useMemo(() => {
        const s = new Set<string>();
        (vendas || []).forEach((v: any) => {
            if (v.orcamentoId) s.add(v.orcamentoId);
        });
        return s;
    }, [vendas]);

    // Detectar orçamento pré-selecionado vindo da navegação (state/query/localStorage)
    useEffect(() => {
        const state = location.state as { orcamentoId?: string } | null;
        const sp = new URLSearchParams(location.search || '');
        const fromState = (state?.orcamentoId || '').trim();
        const fromQuery = (sp.get('orcamentoId') || '').trim();
        let fromStorage = '';
        try {
            fromStorage = (localStorage.getItem('s3e_venda_orcamento_id') || '').trim();
        } catch (_) {
            // ignore
        }
        const selectedOrcamentoId = fromState || fromQuery || fromStorage;
        if (!selectedOrcamentoId) return;

        setActiveTab('nova');
        setVendaForm(prev => ({ ...prev, orcamentoId: selectedOrcamentoId }));
        toast.success('Orçamento pré-selecionado!', {
            description: 'O orçamento foi automaticamente selecionado para criar o pedido de venda.'
        });

        try {
            localStorage.removeItem('s3e_venda_orcamento_id');
        } catch (_) {
            // ignore
        }
        // Limpa query/state para permitir novo disparo em cliques futuros.
        window.history.replaceState({}, document.title, '/vendas');
    }, [location.state, location.search]);

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

    const handleUploadContratoAssinado = async (vendaId: string, file: File) => {
        if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
            toast.error('Selecione um arquivo PDF do contrato assinado.');
            return;
        }
        setUploadContratoLoading(true);
        try {
            const res = await vendasService.uploadContratoAssinado(vendaId, file);
            if (res.success) {
                toast.success(res.message || 'Contrato assinado enviado com sucesso.');
                if (detalhesVenda?.id === vendaId) {
                    setDetalhesVenda((prev: any) => prev ? { ...prev, contratoPdfUrl: res.data?.contratoPdfUrl } : null);
                }
                if (inputContratoRef.current) inputContratoRef.current.value = '';
            } else {
                toast.error(res.error || 'Erro ao enviar contrato.');
            }
        } finally {
            setUploadContratoLoading(false);
        }
    };

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

    const abrirModalEditarVenda = async (vendaId: string) => {
        setVendaParaEditar(null);
        setModalEditarVendaOpen(true);
        setLoadingEditarVenda(true);
        try {
            const res = await vendasService.buscarVenda(vendaId);
            if (res.success && res.data) setVendaParaEditar(res.data);
            else toast.error(res.error || 'Erro ao carregar venda');
        } catch (e) {
            toast.error('Erro ao carregar venda');
        } finally {
            setLoadingEditarVenda(false);
        }
    };

    const fecharModalEditarVenda = () => {
        setModalEditarVendaOpen(false);
        setVendaParaEditar(null);
        loadData();
    };

    const salvarEdicaoVenda = async () => {
        if (!vendaParaEditar?.id) return;
        setSavingEditarVenda(true);
        try {
            const parcelas = (vendaParaEditar.contasReceber || []).map((c: any) => ({
                id: c.id,
                dataVencimento: c.dataVencimento ? String(c.dataVencimento).slice(0, 10) : undefined,
                valorParcela: c.valorParcela ?? c.valor
            })).filter((p: any) => p.id);
            const itensNcm = (vendaParaEditar.orcamento?.items || []).map((item: any) => ({
                id: item.id,
                ncm: item.ncm ?? ''
            })).filter((i: any) => i.id != null);
            const res = await vendasService.atualizarVenda(vendaParaEditar.id, { parcelas, itensNcm });
            if (res.success) {
                toast.success('Venda atualizada com sucesso');
                fecharModalEditarVenda();
            } else toast.error(res.error || 'Erro ao salvar');
        } catch (e) {
            toast.error('Erro ao salvar alterações');
        } finally {
            setSavingEditarVenda(false);
        }
    };

    // Orçamento selecionado
    const orcamentoSelecionado = useMemo(() => {
        if (!vendaForm.orcamentoId) return null;
        return orcamentosAprovados.find(orc => orc.id === vendaForm.orcamentoId) || null;
    }, [vendaForm.orcamentoId, orcamentosAprovados]);

    // Verificar se orçamento selecionado tem kit e notificar
    useEffect(() => {
        if (orcamentoSelecionado && orcamentoSelecionado.items) {
            const temKit = orcamentoSelecionado.items.some((item: any) => item.tipo === 'KIT');
            if (temKit) {
                // Verificar se o usuário é administrador, gerente, desenvolvedor ou tem isAdmin
                const isAdmin = user?.role?.toLowerCase() === 'admin' || 
                               user?.role?.toLowerCase() === 'gerente' || 
                               user?.role?.toLowerCase() === 'desenvolvedor' ||
                               user?.isAdmin === true;
                
                if (isAdmin) {
                    toast.warning('Atenção: Pedido de Venda contém Kit', {
                        description: 'Este orçamento contém item(s) do tipo Kit. O NCM deverá ser informado no momento da emissão da nota fiscal.',
                        duration: 10000
                    });
                }
            }
        }
        // Resetar seleção quando mudar orçamento
        setItensSelecionadosVenda(new Set());
        setItensOrcamentoModificados(null);
    }, [orcamentoSelecionado, user?.id]);

    // Funções para gerenciar seleção e criação de kit
    const toggleItemSelecionadoVenda = (index: number) => {
        setItensSelecionadosVenda(prev => {
            const novo = new Set(prev);
            if (novo.has(index)) {
                novo.delete(index);
            } else {
                novo.add(index);
            }
            return novo;
        });
    };

    const selecionarTodosItensVenda = () => {
        if (!orcamentoSelecionado?.items) return;
        setItensSelecionadosVenda(new Set(orcamentoSelecionado.items.map((_: any, index: number) => index)));
    };

    const deselecionarTodosItensVenda = () => {
        setItensSelecionadosVenda(new Set());
    };

    // Criar kit a partir dos itens selecionados
    const handleCriarKitVenda = () => {
        if (!orcamentoSelecionado?.items) return;

        if (itensSelecionadosVenda.size === 0) {
            toast.error('Nenhum item selecionado', {
                description: 'Selecione pelo menos um item para criar um kit'
            });
            return;
        }

        if (!nomeKitVenda.trim()) {
            toast.error('Nome do kit obrigatório', {
                description: 'Digite um nome para o kit'
            });
            return;
        }

        // Usar itens modificados se existirem, senão usar itens originais
        const itensAtuais = itensOrcamentoModificados || orcamentoSelecionado.items;

        // Calcular valores totais dos itens selecionados
        const itensParaKit = Array.from(itensSelecionadosVenda)
            .sort((a, b) => a - b)
            .map(index => itensAtuais[index])
            .filter(Boolean);

        if (itensParaKit.length === 0) {
            toast.error('Erro ao criar kit', {
                description: 'Nenhum item válido encontrado'
            });
            return;
        }

        const custoTotal = itensParaKit.reduce((sum: number, item: any) => sum + ((item.custoUnit || 0) * (item.quantidade || 1)), 0);
        const subtotalTotal = itensParaKit.reduce((sum: number, item: any) => {
            const precoUnit = item.material?.valorVenda || item.precoUnit || item.precoUnitario || item.valorUnitario || 0;
            const quantidade = item.quantidade || 1;
            return sum + (item.subtotal || (precoUnit * quantidade));
        }, 0);
        const precoUnit = subtotalTotal;

        // Preparar array de itens do kit para salvar (com nome, código e valor de venda atualizado)
        const itensDoKitParaSalvar = itensParaKit.map((item: any) => {
            // Obter código (sku ou ncm) e valor de venda original
            let codigo = '';
            let valorVendaOriginal = 0;
            
            if (item.materialId && item.material) {
                codigo = item.material.sku || '';
                valorVendaOriginal = item.material.valorVenda || item.material.preco || 0;
            } else if (item.cotacaoId && item.cotacao) {
                codigo = item.cotacao.ncm || '';
                valorVendaOriginal = item.cotacao.valorVenda || item.cotacao.valorUnitario || 0;
            } else if (item.material) {
                codigo = item.material.sku || '';
                valorVendaOriginal = item.material.valorVenda || item.material.preco || 0;
            } else if (item.cotacao) {
                codigo = item.cotacao.ncm || '';
                valorVendaOriginal = item.cotacao.valorVenda || item.cotacao.valorUnitario || 0;
            }

            // O valor de venda atualizado é o precoUnit do item (que pode ter sido editado manualmente)
            const valorVendaAtualizado = item.precoUnit || item.precoUnitario || item.valorUnitario || valorVendaOriginal;

            return {
                nome: item.nome || item.descricao || item.material?.nome || item.cotacao?.nome || 'Item',
                codigo: codigo,
                valorVenda: valorVendaAtualizado, // Valor de venda atualizado (pode ter sido editado)
                valorVendaOriginal: valorVendaOriginal, // Valor de venda original do cadastro
                quantidade: item.quantidade || 1,
                unidadeMedida: item.unidadeMedida || 'UN',
                materialId: item.materialId || null,
                cotacaoId: item.cotacaoId || null,
                tipo: item.tipo || 'MATERIAL',
                subtotal: item.subtotal || (valorVendaAtualizado * (item.quantidade || 1))
            };
        });

        // Criar novo item do tipo KIT
        const novoKit: any = {
            tipo: 'KIT',
            nome: nomeKitVenda.trim(),
            // ✅ Para kits customizados, usar o nome do usuário como descricao (será salvo no backend)
            // A descrição detalhada dos itens está em itensDoKit
            descricao: nomeKitVenda.trim(),
            unidadeMedida: 'UN',
            quantidade: 1,
            custoUnit: custoTotal,
            precoUnit: precoUnit,
            precoUnitario: precoUnit,
            subtotal: precoUnit,
            kitId: undefined,
            ncm: ncmKitVenda.trim() || undefined,
            itensDoKit: itensDoKitParaSalvar
        };

        // Remover itens selecionados e adicionar o kit
        const indicesParaRemover = Array.from(itensSelecionadosVenda).sort((a, b) => b - a);
        let novosItems = [...itensAtuais];
        
        indicesParaRemover.forEach(index => {
            novosItems.splice(index, 1);
        });

        novosItems.push(novoKit);

        setItensOrcamentoModificados(novosItems);
        setItensSelecionadosVenda(new Set());
        setNomeKitVenda('');
        setNcmKitVenda('');
        setShowCriarKitModalVenda(false);

        toast.success('Kit criado com sucesso!', {
            description: `${nomeKitVenda.trim()} - R$ ${precoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        });
    };

    // Orçamentos filtrados para exibição
    const orcamentosFiltrados = useMemo(() => {
        // Validação adicional: garantir que apenas orçamentos aprovados sejam considerados
        let filtrados = orcamentosAprovados.filter((orc: any) => {
            const status = orc.status?.toString() || '';
            return status === 'Aprovado' || 
                   status === 'APROVADO' ||
                   status.toLowerCase() === 'aprovado';
        });

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

    // Cálculos financeiros: parcelas iguais ou valores manuais (última parcela = restante)
    const calculosFinanceiros = useMemo(() => {
        const valorTotal = calcularValorAReceberDoOrcamento(orcamentoSelecionado as any);
        const valorEntrada = vendaForm.valorEntrada || 0;
        const valorFinanciado = Math.max(0, valorTotal - valorEntrada);
        const numeroParcelas = vendaForm.parcelas || 1;
        const parcelasIguais = vendaForm.parcelasIguais !== false;
        const valoresManuais = vendaForm.valoresParcelas && vendaForm.valoresParcelas.length >= numeroParcelas - 1;

        let valorParcela = 0;
        let valoresPorParcela: number[] = [];

        if (parcelasIguais || !valoresManuais) {
            valorParcela = numeroParcelas > 0 ? Math.round((valorFinanciado / numeroParcelas) * 100) / 100 : 0;
            valoresPorParcela = Array(numeroParcelas).fill(valorParcela);
        } else {
            const arr = vendaForm.valoresParcelas!;
            const somaExcetoUltima = arr.slice(0, numeroParcelas - 1).reduce((s, v) => s + (Number(v) || 0), 0);
            const ultimaParcela = Math.round((valorFinanciado - somaExcetoUltima) * 100) / 100;
            valoresPorParcela = [...arr.slice(0, numeroParcelas - 1).map(v => Math.round((Number(v) || 0) * 100) / 100), ultimaParcela];
            valorParcela = valoresPorParcela[0] ?? 0;
        }

        return {
            valorTotal,
            valorFinanciado,
            valorParcela,
            valoresPorParcela
        };
    }, [orcamentoSelecionado, vendaForm.valorEntrada, vendaForm.parcelas, vendaForm.parcelasIguais, vendaForm.valoresParcelas]);

    /** Faturamento e quantidade apenas do mês calendário atual (meta mensal). */
    const metricasMesAtual = useMemo(() => {
        const now = new Date();
        const vendasNoMes = vendas.filter((v) => {
            const d = new Date(v.dataVenda || v.createdAt);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const faturamento = vendasNoMes.reduce((acc: number, v: any) => acc + (v.valorTotal || 0), 0);
        return {
            faturamento,
            quantidade: vendasNoMes.length,
            mesLabel: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        };
    }, [vendas]);

    // Estatísticas do dashboard: barra de meta usa só o mês atual; gráfico usa 6 meses (chartDataVendas)
    const estatisticasVendas = useMemo(() => {
        const faturamentoMes = dashboardData?.receitaMes ?? metricasMesAtual.faturamento;
        const vendasMes = dashboardData?.vendasMes ?? metricasMesAtual.quantidade;
        const ticketMedio = vendasMes > 0 ? faturamentoMes / vendasMes : 0;

        return {
            faturamentoMes,
            vendasMes,
            ticketMedio,
            metaMes: metaMensal,
            mesLabel: metricasMesAtual.mesLabel,
            percentualMeta: metaMensal > 0 ? (faturamentoMes / metaMensal) * 100 : 0,
        };
    }, [dashboardData, metricasMesAtual, metaMensal]);

    // Dados para gráfico: faturamento nos últimos 6 meses
    const chartDataVendas = useMemo(() => {
        const now = new Date();
        const months: { mes: string; faturamento: number; vendas: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mesLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
            const vendasNoMes = vendas.filter((v) => {
                const dataVenda = new Date(v.dataVenda || v.createdAt);
                return dataVenda.getMonth() === d.getMonth() && dataVenda.getFullYear() === d.getFullYear();
            });
            const faturamento = vendasNoMes.reduce((acc: number, v: any) => acc + (v.valorTotal || 0), 0);
            months.push({ mes: mesLabel, faturamento, vendas: vendasNoMes.length });
        }
        return months;
    }, [vendas]);

    const formasPagamento = [
        'À vista',
        'Cartão de crédito',
        'Boleto integral',
        'Boleto parcelado'
    ];

    // Templates HTML de contrato
    const TEMPLATE_CONTRATO_SIMPLIFICADO_HTML = `<div class="contrato-documento">
<p style="text-align:center;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 24pt 0;"><strong>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ENGENHARIA</strong></p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;margin:0 0 18pt 0;"><strong>IDENTIFICAÇÃO DAS PARTES CONTRATANTES</strong></p>
<p><strong>CONTRATANTE:</strong> {{CLIENTE}}, inscrito no CPF/CNPJ sob o nº {{CPF_CNPJ_CLIENTE}}, residente ou sediado em {{ENDEREÇO_CLIENTE}}, doravante denominado CLIENTE{{CONSTRUTOR_TRECHO}}.</p>
<p><strong>CONTRATADA:</strong> {{RAZAO_SOCIAL_S3E}}, estabelecida em {{ENDEREÇO_S3E}}, inscrita no C.N.P.J. sob o nº {{CNPJ_S3E}}, e no Cadastro Estadual sob o nº {{IE_S3E}}, neste ato representada por Alois Max Wagner, brasileiro, Engenheiro Eletricista portador da Carteira de Identidade nº 272510543, C.P.F. nº 000.536.890,11.</p>
<p style="text-align:center;font-weight:700;margin:12pt 0 20pt 0;">As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços de Engenharia, Projeto de Instalações Elétrica Interno + Celesc, Agendamento de Vistoria e Desligamento que se regerá pelas cláusulas seguintes e pelas condições de pagamento descritas no presente.</p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>DO OBJETO DO CONTRATO</strong></p>
<p><strong>Cláusula 1ª.</strong> O presente contrato tem como OBJETO, a prestação, pela CONTRATADA do projeto elétrico de entrada de energia á CONTRATANTE.</p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>DOS SERVIÇOS</strong></p>
<p><strong>Cláusula 2ª.</strong> Os serviços contratados neste instrumento consistem em projeto elétrico entrada de energia/ quadro de medição por unidade trifásica; projeto elétrico de entrada de energia/ quadro de medição por unidade; projeto elétrico/ temática (internos) para distribuição das áreas privativas e de uso comum e agendamento de vistoria/ desligamento.</p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>DAS OBRIGAÇÕES</strong></p>
<p><strong>Cláusula 3ª.</strong> Os serviços e as informações técnicas específicas utilizados na consecução do serviço deverão ser utilizados única e exclusivamente para o fim estabelecido neste instrumento, não podendo a CONTRATANTE utilizá-la para outras instalações elétricas e de lógica que porventura esteja desenvolvendo.</p>
<p><strong>Cláusula 4ª.</strong> A CONTRATANTE não poderá repassar as informações técnicas relativas aos serviços prestados para terceiros.</p>
<p><strong>Parágrafo único.</strong> As informações técnicas que não poderão ser passadas pela CONTRATANTE serão aquelas consideradas sigilosas, ou seja, que não estejam protegidas através de concessão de patente.</p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>DA VIGENCIA DO CONTRATO</strong></p>
<p><strong>Cláusula 5ª.</strong> O presente contrato tem estipulado separadamente a vigência de cada etapa. Para elaboração do projeto elétrico, foi estimado um prazo de sete (7) dias. Caso ocorra alguma eventual alteração solicitada este prazo poderá ser estendido. O protocolo na Concessionária Celesc pode levar até 60 dias (normalmente antes).</p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>DO PREÇO E FORMA DE PAGAMENTO</strong></p>
<p><strong>Cláusula 6ª.</strong> A contratada teve aprovação do orçamento de nº {{NUMERO_ORCAMENTO}} no valor de {{VALOR_TOTAL}}, referente projeto elétrico. Pela prestação dos serviços acertados, a CONTRATANTE pagará à CONTRATADA conforme descrito a seguir:</p>
<p><strong>Forma de pagamento:</strong> {{FORMA_PAGAMENTO}}.<br/>{{DETALHE_PARCELAS}}</p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>DA RESCISÃO</strong></p>
<p><strong>Cláusula 8ª.</strong> O presente instrumento será rescindido caso uma das partes descumpra o estabelecido em qualquer uma das cláusulas deste contrato.</p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>DO FORO</strong></p>
<p><strong>Cláusula 9ª.</strong> Para dirimir quaisquer controvérsias oriundas do CONTRATO, as partes elegem o foro da comarca de Itajaí/SC.</p>
</div>`;

    const TEMPLATE_CONTRATO_SUBESTACAO_HTML = `<div class="contrato-documento">
<p style="text-align:center;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 24pt 0;"><strong>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ENGENHARIA</strong></p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;margin:0 0 18pt 0;"><strong>IDENTIFICAÇÃO DAS PARTES CONTRATANTES</strong></p>
<p><strong>CONTRATANTE:</strong> {{CLIENTE}}, inscrito no CPF/CNPJ sob o nº {{CPF_CNPJ_CLIENTE}}, residente ou sediado em {{ENDEREÇO_CLIENTE}}.</p>
<p><strong>CONTRATADA:</strong> {{RAZAO_SOCIAL_S3E}}, estabelecida em {{ENDEREÇO_S3E}}, inscrita no C.N.P.J. sob o nº {{CNPJ_S3E}}, e no Cadastro Estadual sob o nº {{IE_S3E}}, neste ato representada por Alois Max Wagner, brasileiro, Engenheiro Eletricista portador da Carteira de Identidade nº 272510543, C.P.F. nº 000.536.890,11.</p>
<p style="text-align:center;font-weight:700;margin:12pt 0 20pt 0;">As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços de Engenharia e para projeto e construção de subestação de energia, que se regerá pelas cláusulas seguintes e pelas condições de pagamento descritas no presente.</p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>DO OBJETO DO CONTRATO</strong></p>
<p><strong>Cláusula 1ª.</strong> O presente contrato tem como OBJETO, a prestação, pela CONTRATADA para execução dos serviços de engenharia e construção á CONTRATANTE.</p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>DOS SERVIÇOS</strong></p>
<p><strong>Cláusula 2ª.</strong> Os serviços contratados neste instrumento consistem em projeto elétrico e execução de uma subestação de energia, conforme descrito no orçamento {{NUMERO_ORCAMENTO}}.</p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>INFORMAÇÕES TÉCNICAS DA SUBESTAÇÃO</strong></p>
<ul>
<li>Subestação de energia com transformador de 300 kVA, classe de tensão 25 kV, tipo refrigerado a óleo, fixado no poste;</li>
<li>Cabine de subestação pré-fabricada, completa com todas as montagens (quadro de medidor, quadro de TC, caixa BEP, aterramentos), conforme normas da Celesc.</li>
<li>Quadro de proteção instalado no interior da cabine, em invólucro metálico (dimensões: 1000 x 550 x 250 mm), contendo disjuntor tripolar de 450 A, disjuntor para iluminação interna e dispositivo de proteção contra surtos (DPS), conforme projeto.</li>
<li>Poste cônico de 11 m e resistência 1000 dAN, com montagens (cruzetas, para-raios e ferragens), conforme normas da Celesc.</li>
<li>Cabos de baixa tensão entre transformador e disjuntor geral: condutores flexíveis HEPR 120 mm², classe de isolação 1 kV.</li>
<li>Malha de aterramento dimensionada e executada conforme normas da Celesc.</li>
</ul>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>ESCOPO DOS SERVIÇOS CONTRATADOS</strong></p>
<ul>
<li>Elaboração do projeto elétrico de medição e proteção da subestação.</li>
<li>Elaboração e protocolo de consulta prévia de viabilidade junto à concessionária de energia.</li>
<li>Desenvolvimento do projeto elétrico completo para aprovação pela concessionária, visando à posterior execução.</li>
<li>Emissão da Anotação de Responsabilidade Técnica (ART) junto ao CREA/SC.</li>
<li>Acompanhamento do processo de análise do projeto até sua aprovação pela concessionária.</li>
<li>Execução de toda a instalação elétrica referente à subestação de energia (até o QDG interno).</li>
<li>Assessoria para ligação de energia provisória de obra em baixa tensão, monofásica, 50 A (sem fornecimento de materiais).</li>
<li>Assessoria até a finalização do processo de ligação da energia na subestação pela Celesc.</li>
</ul>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>SERVIÇOS NÃO INCLUSOS</strong></p>
<ul>
<li>Materiais e mão de obra para prumadas internas (do quadro da subestação aos quadros internos) — poderão ser orçados separadamente;</li>
<li>Serviços e mão de obra civil (base da cabine, abrigos, muros, canaletas, casas de comando etc.);</li>
<li>Materiais de construção civil (concreto, blocos, argamassa, ferragens civis, telhas, portas metálicas não especificadas etc.);</li>
<li>Custos para adiantamento da obra de derivação — serão levantados após formalização do projeto de conexão pela CELESC.</li>
</ul>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>DAS OBRIGAÇÕES</strong></p>
<p class="c-clause"><strong>Cláusula 3ª.</strong> Os serviços e as informações técnicas específicas utilizados na execução do serviço deverão ser utilizados única e exclusivamente para o fim estabelecido neste instrumento, não podendo a CONTRATANTE utilizá-la para outras instalações elétricas.</p>
<p class="c-clause"><strong>Cláusula 4ª.</strong> A CONTRATANTE não poderá repassar as informações técnicas relativas aos serviços prestados para terceiros.</p>
<p class="c-clause"><strong>Parágrafo único.</strong> As informações técnicas que não poderão ser passadas pela CONTRATANTE serão aquelas consideradas sigilosas, ou seja, que não estejam protegidas através de concessão de patente.</p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>DAS ALTERAÇÕES</strong></p>
<p class="c-clause"><strong>Cláusula 4ª.</strong> O orçamento foi elaborado com base no projeto arquitetônico, na visita técnica à obra. Caso surjam necessidades especiais ou demandas específicas durante a validação do projeto elétrico pelo cliente, os valores e prazos poderão ser ajustados. Após a instalação concluída e entregue, toda e qualquer alteração necessária exigirá renegociação do contrato e valor adicional ao combinado. Havendo solicitação da CONTRATANTE, este deverá ser por escrito, e somente será executada com o aceite da CONTRATADA. Se aceita, deverá ser elaborado um aditivo contratual com todas as definições.</p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>DA VIGÊNCIA DO CONTRATO</strong></p>
<p class="c-clause"><strong>Cláusula 5ª.</strong> O presente contrato tem estipulado separadamente a vigência de cada serviço a ser executado. Projeto elétrico: Contidas na descrição do orçamento {{NUMERO_ORCAMENTO}}. Construção da subestação: Contidas na descrição do orçamento {{NUMERO_ORCAMENTO}}.</p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>DO PREÇO E FORMA DE PAGAMENTO</strong></p>
<p class="c-clause"><strong>Cláusula 6ª.</strong> Conforme acordado entre as partes, as obrigações financeiras relativas ao presente contrato obedecem às seguintes condições:</p>
<p><strong>Valor total do contrato (orçamento nº {{NUMERO_ORCAMENTO}}):</strong> {{VALOR_TOTAL}}.</p>
<p><strong>Forma de pagamento:</strong> {{FORMA_PAGAMENTO}}.<br/>{{DETALHE_PARCELAS}}</p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>DA RESCISÃO</strong></p>
<p class="c-clause"><strong>Cláusula 7ª.</strong> O presente instrumento será rescindido caso uma das partes descumpra o estabelecido em qualquer uma das cláusulas deste contrato.</p>
<p style="text-align:center;font-weight:700;text-transform:uppercase;margin:20pt 0 14pt 0;"><strong>DO FORO</strong></p>
<p class="c-clause"><strong>Cláusula 8ª.</strong> Para dirimir quaisquer controvérsias oriundas do CONTRATO, as partes elegem o foro da comarca de Itajaí/SC.</p>
</div>`;

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

    // Garantir regras básicas de forma de pagamento x parcelas no frontend
    useEffect(() => {
        if (vendaForm.formaPagamento === 'À vista' && vendaForm.parcelas !== 1) {
            setVendaForm(prev => ({ ...prev, parcelas: 1 }));
        }
        if (vendaForm.formaPagamento === 'Boleto integral') {
            setVendaForm(prev => ({
                ...prev,
                parcelas: 1,
                dataCobrancaBoleto: prev.dataCobrancaBoleto || hojeISO()
            }));
        }
    }, [vendaForm.formaPagamento]);

    // Boleto parcelado: manter array de datas das parcelas (uma por parcela)
    useEffect(() => {
        if (vendaForm.formaPagamento !== 'Boleto parcelado') return;
        const n = Math.max(1, vendaForm.parcelas || 1);
        setVendaForm(prev => {
            const atual = prev.datasParcelas || [];
            const novas: string[] = [];
            for (let i = 0; i < n; i++) {
                if (atual[i]) {
                    novas.push(atual[i]);
                } else if (i === 0 && prev.dataPrimeiraParcela) {
                    novas.push(prev.dataPrimeiraParcela);
                } else {
                    const d = new Date(i === 0 ? prev.dataPrimeiraParcela : novas[i - 1]);
                    d.setMonth(d.getMonth() + 1);
                    novas.push(d.toISOString().split('T')[0]);
                }
            }
            return { ...prev, datasParcelas: novas };
        });
    }, [vendaForm.formaPagamento, vendaForm.parcelas]);

    // Valores manuais: manter array com (n-1) valores editáveis; quando parcelas ou parcelasIguais mudam, (re)inicializar
    useEffect(() => {
        const n = Math.max(1, vendaForm.parcelas || 1);
        if (vendaForm.parcelasIguais) {
            setVendaForm(prev => (prev.valoresParcelas?.length ? { ...prev, valoresParcelas: [] } : prev));
            return;
        }
        setVendaForm(prev => {
            const valorTotal = calcularValorAReceberDoOrcamento(orcamentoSelecionado as any);
            const valorEntrada = prev.valorEntrada || 0;
            const valorRestante = Math.max(0, valorTotal - valorEntrada);
            const igual = n > 0 ? valorRestante / n : 0;
            const atual = prev.valoresParcelas || [];
            const novas: number[] = [];
            for (let i = 0; i < n - 1; i++) {
                novas.push(typeof atual[i] === 'number' && atual[i] >= 0 ? Math.round(atual[i] * 100) / 100 : Math.round(igual * 100) / 100);
            }
            return { ...prev, valoresParcelas: novas };
        });
    }, [vendaForm.parcelas, vendaForm.parcelasIguais, orcamentoSelecionado?.id, orcamentoSelecionado?.items, orcamentoSelecionado?.precoVenda, orcamentoSelecionado?.descontoValor]);

    /** Monta endereço completo a partir de empresa fiscal (S3E) */
    const getEnderecoS3E = (empresa: EmpresaFiscal | undefined): string => {
        if (!empresa) return 'A definir';
        const parts = [empresa.endereco, empresa.numero, empresa.bairro, `${empresa.cidade}/${empresa.estado}`].filter(Boolean);
        return parts.length ? parts.join(', ') : 'A definir';
    };

    const normalizeCnpj = (cnpj: string | number | undefined | null): string => String(cnpj ?? '').replace(/\D/g, '');
    const findEmpresaFiscalByCnpj = (cnpj: string | number | undefined | null): EmpresaFiscal | undefined => {
        const norm = normalizeCnpj(cnpj);
        if (!norm) return undefined;
        return empresasFiscais.find(e => normalizeCnpj(e.cnpj) === norm);
    };

    const formatDataExtensoPtBR = (date: Date): string =>
        date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

    const formatISOToPtBR = (iso: string | undefined | null): string => {
        if (!iso) return '—';
        const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('pt-BR');
    };

    const addMonthsISO = (isoDate: string, monthsToAdd: number): string => {
        const base = new Date(`${isoDate}T12:00:00`);
        if (Number.isNaN(base.getTime())) return isoDate;
        base.setMonth(base.getMonth() + monthsToAdd);
        return base.toISOString().split('T')[0];
    };

    // Aplica replace dinâmico e escolhe qual modelo de contrato carregar inicialmente
    const getContratoComReplaces = (tipo: 'simplificado' | 'subestacao' = 'simplificado'): string => {
        const cliente = orcamentoSelecionado?.cliente?.nome || orcamentoSelecionado?.cliente?.razaoSocial || 'CLIENTE';
        const empresaFiscalPorId = orcamentoSelecionado?.empresaFiscalId
            ? empresasFiscais.find(e => e.id === orcamentoSelecionado.empresaFiscalId)
            : undefined;
        const cnpjS3E =
            orcamentoSelecionado?.empresaCNPJ ||
            (orcamentoSelecionado as any)?.empresaFiscal?.cnpj ||
            empresaFiscalPorId?.cnpj ||
            empresasFiscais[0]?.cnpj ||
            '—';
        const empresaS3E = empresaFiscalPorId || findEmpresaFiscalByCnpj(cnpjS3E) || empresasFiscais[0];
        const enderecoS3E = getEnderecoS3E(empresaS3E);
        const razaoSocialS3E = empresaS3E?.razaoSocial || empresaS3E?.nomeFantasia || 'S3E';
        const ieS3E = empresaS3E?.inscricaoEstadual || '—';
        const cpfCnpjCliente = orcamentoSelecionado?.cliente?.cpfCnpj || orcamentoSelecionado?.cliente?.cnpj || orcamentoSelecionado?.cliente?.cpf || '—';
        const enderecoCliente = orcamentoSelecionado?.enderecoObra || orcamentoSelecionado?.cliente?.endereco || 'A definir';
        const idVenda = '—';
        const numeroOrcamento = orcamentoSelecionado?.numeroSequencial != null ? String(orcamentoSelecionado.numeroSequencial) : (orcamentoSelecionado?.numeroOrcamento || orcamentoSelecionado?.id?.slice(0, 8) || '—');
        const valorTotal = calculosFinanceiros.valorTotal;
        const valorTotalFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal);
        const formaPagamento = vendaForm.formaPagamento;
        const n = vendaForm.parcelas || 1;
        const datasParcelasResolvidas = ((): string[] => {
            if (Array.isArray(vendaForm.datasParcelas) && vendaForm.datasParcelas.length >= n) {
                return vendaForm.datasParcelas.slice(0, n);
            }
            const primeira = vendaForm.dataPrimeiraParcela || hojeISO();
            return Array.from({ length: n }, (_, i) => addMonthsISO(primeira, i));
        })();

        // Use diretamente os valores resolvidos pelo cálculo financeiro (inclui "restante" quando valores manuais).
        const valoresParcelasResolvidos = ((): number[] => {
            const arr = Array.isArray(calculosFinanceiros.valoresPorParcela) ? calculosFinanceiros.valoresPorParcela : [];
            if (arr.length >= n) return arr.slice(0, n);
            const v = Math.round(calculosFinanceiros.valorParcela * 100) / 100;
            return Array.from({ length: n }, () => v);
        })();

        const entradaValor = vendaForm.formaPagamento === 'Boleto parcelado' ? (Number(vendaForm.valorEntrada) || 0) : 0;
        const entradaVencimento = formatISOToPtBR(new Date().toISOString().split('T')[0]);

        const detalheParcelas = vendaForm.formaPagamento === 'Boleto integral'
            ? `Pagamento em boleto único, vencimento em ${formatISOToPtBR(vendaForm.dataCobrancaBoleto)}.`
            : (() => {
                const linhasParcelas = valoresParcelasResolvidos
                    .map((v, i) => `Parcela ${i + 1} (venc. ${formatISOToPtBR(datasParcelasResolvidas[i])}): R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

                const linhaEntrada = entradaValor > 0
                    ? `Entrada (venc. ${entradaVencimento}): R$ ${entradaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : null;

                return [linhaEntrada, ...linhasParcelas].filter(Boolean).join('<br/>');
            })();

        const dataGeracao = formatDataExtensoPtBR(new Date());
        const construtorTrecho = '';

        const baseTemplate =
            tipo === 'subestacao'
                ? TEMPLATE_CONTRATO_SUBESTACAO_HTML
                : TEMPLATE_CONTRATO_SIMPLIFICADO_HTML;

        return baseTemplate
            .replace(/\{\{CNPJ_S3E\}\}/g, cnpjS3E)
            .replace(/\{\{ENDEREÇO_S3E\}\}/g, enderecoS3E)
            .replace(/\{\{RAZAO_SOCIAL_S3E\}\}/g, razaoSocialS3E)
            .replace(/\{\{IE_S3E\}\}/g, ieS3E)
            .replace(/\{\{CPF_CNPJ_CLIENTE\}\}/g, cpfCnpjCliente)
            .replace(/\{\{ENDEREÇO_CLIENTE\}\}/g, enderecoCliente)
            .replace(/\{\{ID_VENDA\}\}/g, idVenda)
            .replace(/\{\{CLIENTE\}\}/g, cliente)
            .replace(/\{\{NUMERO_ORCAMENTO\}\}/g, numeroOrcamento)
            .replace(/\{\{VALOR_TOTAL\}\}/g, valorTotalFmt)
            .replace(/\{\{FORMA_PAGAMENTO\}\}/g, formaPagamento)
            .replace(/\{\{DETALHE_PARCELAS\}\}/g, detalheParcelas)
            .replace(/\{\{CONSTRUTOR_TRECHO\}\}/g, construtorTrecho);
    };

    /** Gera o HTML do contrato a partir dos dados de uma venda (para abrir modal a partir dos detalhes).
     * Mantém compatibilidade usando o modelo simplificado como padrão.
     */
    const getContratoComReplacesFromVenda = (venda: any): string => {
        const cliente = venda.cliente?.nome || venda.cliente?.razaoSocial || venda.orcamento?.cliente?.nome || 'CLIENTE';
        const orc = venda.orcamento || {};
        const empresaFiscalPorId = orc.empresaFiscalId ? empresasFiscais.find(e => e.id === orc.empresaFiscalId) : undefined;
        const cnpjS3E = orc.empresaCNPJ || orc.empresaFiscal?.cnpj || empresaFiscalPorId?.cnpj || empresasFiscais[0]?.cnpj || '—';
        const empresaS3E = empresaFiscalPorId || findEmpresaFiscalByCnpj(cnpjS3E) || empresasFiscais[0];
        const enderecoS3E = getEnderecoS3E(empresaS3E);
        const razaoSocialS3E = empresaS3E?.razaoSocial || empresaS3E?.nomeFantasia || 'S3E';
        const ieS3E = empresaS3E?.inscricaoEstadual || '—';
        const cpfCnpjCliente = venda.cliente?.cpfCnpj || venda.cliente?.cnpj || venda.cliente?.cpf || orc.cliente?.cpfCnpj || orc.cliente?.cpfCnpj || '—';
        const enderecoCliente = orc.enderecoObra || venda.cliente?.endereco || orc.cliente?.endereco || 'A definir';
        const idVenda = String((venda as any).numeroVenda ?? venda.id ?? '—');
        const numeroOrcamento = orc.numeroSequencial != null ? String(orc.numeroSequencial) : (orc.numeroOrcamento || orc.id?.slice?.(0, 8) || venda.orcamentoId?.slice?.(0, 8) || '—');
        const valorTotal = Number(venda.valorTotal) || 0;
        const valorTotalFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal);
        const formaPagamento = venda.formaPagamento || 'N/A';

        const contasReceber = Array.isArray(venda.contasReceber) ? venda.contasReceber : [];
        const contaEntrada = contasReceber.find((c: any) =>
            (c.numeroParcela ?? null) === 0 || String(c.descricao || '').toLowerCase().includes('entrada')
        );

        const contasParcelas = contasReceber
            .filter((c: any) => (c.numeroParcela ?? 0) > 0)
            .sort((a: any, b: any) => (a.numeroParcela || 0) - (b.numeroParcela || 0));

        const n = contasParcelas.length || venda.numeroParcelas || 1;

        const entradaValor = contaEntrada ? Number(contaEntrada.valorParcela || contaEntrada.valor || 0) : 0;
        const entradaVenc = contaEntrada?.dataVencimento ? new Date(contaEntrada.dataVencimento).toLocaleDateString('pt-BR') : '—';
        const linhaEntrada = formaPagamento === 'Boleto parcelado' && entradaValor > 0
            ? `Entrada (venc. ${entradaVenc}): R$ ${entradaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : null;

        const detalheParcelasParcela =
            (n === 1 && contasParcelas[0]?.dataVencimento && !linhaEntrada)
                ? `Pagamento em boleto único, vencimento em ${new Date(contasParcelas[0].dataVencimento).toLocaleDateString('pt-BR')}.`
                : contasParcelas.length > 0
                    ? contasParcelas
                        .map((c: any, i: number) => {
                            const venc = c.dataVencimento ? new Date(c.dataVencimento).toLocaleDateString('pt-BR') : '—';
                            const val = Number(c.valorParcela || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            return `Parcela ${i + 1} (venc. ${venc}): R$ ${val}`;
                        })
                        .join('<br/>')
                    : `${n}x de R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.round((valorTotal / (n || 1)) * 100) / 100)}`;

        const detalheParcelas = linhaEntrada ? [linhaEntrada, detalheParcelasParcela].join('<br/>') : detalheParcelasParcela;

        const construtorTrecho = '';

        return TEMPLATE_CONTRATO_SIMPLIFICADO_HTML
            .replace(/\{\{CNPJ_S3E\}\}/g, cnpjS3E)
            .replace(/\{\{ENDEREÇO_S3E\}\}/g, enderecoS3E)
            .replace(/\{\{RAZAO_SOCIAL_S3E\}\}/g, razaoSocialS3E)
            .replace(/\{\{IE_S3E\}\}/g, ieS3E)
            .replace(/\{\{CPF_CNPJ_CLIENTE\}\}/g, cpfCnpjCliente)
            .replace(/\{\{ENDEREÇO_CLIENTE\}\}/g, enderecoCliente)
            .replace(/\{\{ID_VENDA\}\}/g, idVenda)
            .replace(/\{\{CLIENTE\}\}/g, cliente)
            .replace(/\{\{NUMERO_ORCAMENTO\}\}/g, numeroOrcamento)
            .replace(/\{\{VALOR_TOTAL\}\}/g, valorTotalFmt)
            .replace(/\{\{FORMA_PAGAMENTO\}\}/g, formaPagamento)
            .replace(/\{\{DETALHE_PARCELAS\}\}/g, detalheParcelas)
            .replace(/\{\{CONSTRUTOR_TRECHO\}\}/g, construtorTrecho);
    };

    /** Valores resolvidos para os botões Tags Rápidas (inserir no cursor ao clicar) */
    type ContratoResolvedValues = {
        cliente: string;
        cpfCnpjCliente: string;
        empresa: string;
        cnpjS3E: string;
        numeroOrcamento: string;
        dataGeracao: string;
        valorTotal: string;
        detalheParcelas: string;
        formaPagamento: string;
    };

    const resolveContratoValuesFromVendaLike = (v: any): ContratoResolvedValues => {
        const cliente = v?.cliente?.nome || v?.cliente?.razaoSocial || v?.orcamento?.cliente?.nome || 'CLIENTE';
        const cpfCnpjCliente = v?.cliente?.cpfCnpj || v?.cliente?.cnpj || v?.cliente?.cpf || v?.orcamento?.cliente?.cpfCnpj || '—';
        const orc = v?.orcamento || {};
        const empresaFiscalPorId = orc.empresaFiscalId ? empresasFiscais.find(e => e.id === orc.empresaFiscalId) : undefined;
        const cnpjS3E = orc.empresaCNPJ || orc.empresaFiscal?.cnpj || empresaFiscalPorId?.cnpj || '—';
        const empresaS3E = empresaFiscalPorId || findEmpresaFiscalByCnpj(cnpjS3E) || empresasFiscais[0];
        const empresa = empresaS3E?.razaoSocial || empresaS3E?.nomeFantasia || 'S3E';
        const numeroOrcamento = orc.numeroSequencial != null ? String(orc.numeroSequencial) : (orc.numeroOrcamento || orc.id?.slice?.(0, 8) || v?.orcamentoId?.slice?.(0, 8) || '—');
        const dataGeracao = formatDataExtensoPtBR(new Date(v?.dataVenda || v?.createdAt || Date.now()));
        const valorTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v?.valorTotal) || 0);
        const formaPagamento = v?.formaPagamento || 'N/A';

        const contasReceber = Array.isArray(v?.contasReceber) ? v.contasReceber : [];
        const contaEntrada = contasReceber.find((c: any) =>
            (c.numeroParcela ?? null) === 0 || String(c.descricao || '').toLowerCase().includes('entrada')
        );

        const contasParcelas = contasReceber
            .filter((c: any) => (c.numeroParcela ?? 0) > 0)
            .sort((a: any, b: any) => (a.numeroParcela || 0) - (b.numeroParcela || 0));

        const n = contasParcelas.length || v?.numeroParcelas || 1;

        const entradaValor = contaEntrada ? Number(contaEntrada.valorParcela || contaEntrada.valor || 0) : 0;
        const entradaVenc = contaEntrada?.dataVencimento ? new Date(contaEntrada.dataVencimento).toLocaleDateString('pt-BR') : '—';
        const linhaEntrada = formaPagamento === 'Boleto parcelado' && entradaValor > 0
            ? `Entrada (venc. ${entradaVenc}): R$ ${entradaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : null;

        const detalheParcelasParcela =
            (n === 1 && contasParcelas[0]?.dataVencimento && !linhaEntrada)
                ? `Pagamento em boleto único, vencimento em ${new Date(contasParcelas[0].dataVencimento).toLocaleDateString('pt-BR')}.`
                : contasParcelas.length > 0
                    ? contasParcelas
                        .map((c: any, i: number) => {
                            const venc = c.dataVencimento ? new Date(c.dataVencimento).toLocaleDateString('pt-BR') : '—';
                            const val = Number(c.valorParcela || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            return `Parcela ${i + 1} (venc. ${venc}): R$ ${val}`;
                        })
                        .join('<br/>')
                    : `${n}x de R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.round(((Number(v?.valorTotal) || 0) / (n || 1)) * 100) / 100)}`;

        const detalheParcelas = linhaEntrada ? [linhaEntrada, detalheParcelasParcela].join('<br/>') : detalheParcelasParcela;

        return {
            cliente,
            cpfCnpjCliente,
            empresa,
            cnpjS3E,
            numeroOrcamento,
            dataGeracao,
            valorTotal,
            detalheParcelas,
            formaPagamento
        };
    };

    const contratoResolvedValues: ContratoResolvedValues = useMemo(() => {
        if (contratoVendaId && detalhesVenda) {
            return resolveContratoValuesFromVendaLike(detalhesVenda);
        }

        const cliente = orcamentoSelecionado?.cliente?.nome || orcamentoSelecionado?.cliente?.razaoSocial || 'CLIENTE';
        const cpfCnpjCliente = orcamentoSelecionado?.cliente?.cpfCnpj || orcamentoSelecionado?.cliente?.cnpj || orcamentoSelecionado?.cliente?.cpf || '—';
        const empresaFiscalPorId = orcamentoSelecionado?.empresaFiscalId
            ? empresasFiscais.find(e => e.id === orcamentoSelecionado.empresaFiscalId)
            : undefined;
        const cnpjS3E = orcamentoSelecionado?.empresaCNPJ || (orcamentoSelecionado as any)?.empresaFiscal?.cnpj || empresaFiscalPorId?.cnpj || empresasFiscais[0]?.cnpj || '—';
        const empresaS3E = empresaFiscalPorId || findEmpresaFiscalByCnpj(cnpjS3E) || empresasFiscais[0];
        const empresa = empresaS3E?.razaoSocial || empresaS3E?.nomeFantasia || 'S3E';
        const numeroOrcamento = orcamentoSelecionado?.numeroSequencial != null ? String(orcamentoSelecionado.numeroSequencial) : (orcamentoSelecionado?.numeroOrcamento || orcamentoSelecionado?.id?.slice(0, 8) || '—');
        const dataGeracao = formatDataExtensoPtBR(new Date());
        const valorTotal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculosFinanceiros.valorTotal);

        const n = vendaForm.parcelas || 1;

        const datasParcelasResolvidas = ((): string[] => {
            if (Array.isArray(vendaForm.datasParcelas) && vendaForm.datasParcelas.length >= n) {
                return vendaForm.datasParcelas.slice(0, n);
            }
            const primeira = vendaForm.dataPrimeiraParcela || hojeISO();
            return Array.from({ length: n }, (_, i) => addMonthsISO(primeira, i));
        })();

        const valoresPorParcelaResolvidos = ((): number[] => {
            const arr = Array.isArray(calculosFinanceiros.valoresPorParcela) ? calculosFinanceiros.valoresPorParcela : [];
            if (arr.length >= n) return arr.slice(0, n);
            const v = Math.round(calculosFinanceiros.valorParcela * 100) / 100;
            return Array.from({ length: n }, () => v);
        })();

        const entradaValor = vendaForm.formaPagamento === 'Boleto parcelado' ? (Number(vendaForm.valorEntrada) || 0) : 0;
        const entradaVencimento = formatISOToPtBR(new Date().toISOString().split('T')[0]);

        const detalheParcelas = vendaForm.formaPagamento === 'Boleto integral'
            ? `Pagamento em boleto único, vencimento em ${vendaForm.dataCobrancaBoleto ? new Date(vendaForm.dataCobrancaBoleto + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}.`
            : (() => {
                const linhasParcelas = valoresPorParcelaResolvidos
                    .map((v, i) => `Parcela ${i + 1} (venc. ${formatISOToPtBR(datasParcelasResolvidas[i])}): R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

                const linhaEntrada = entradaValor > 0
                    ? `Entrada (venc. ${entradaVencimento}): R$ ${entradaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : null;

                return [linhaEntrada, ...linhasParcelas].filter(Boolean).join('<br/>');
            })();

        return {
            cliente,
            cpfCnpjCliente,
            empresa,
            cnpjS3E,
            numeroOrcamento,
            dataGeracao,
            valorTotal,
            detalheParcelas,
            formaPagamento: vendaForm.formaPagamento
        };
    }, [contratoVendaId, detalhesVenda, orcamentoSelecionado, vendaForm, calculosFinanceiros, empresasFiscais]);

    const handleAbrirGerarContrato = (tipo: 'simplificado' | 'subestacao' = 'simplificado') => {
        if (!orcamentoSelecionado) {
            toast.error('Selecione um orçamento antes de gerar o contrato.');
            return;
        }
        setContratoVendaId(null);
        setTipoContratoModal(tipo);
        setConteudoContrato(getContratoComReplaces(tipo));
        setActiveTabContrato('design');
        setModalContratoOpen(true);
    };

    /** Abre o modal de contrato a partir dos detalhes da venda (permite Salvar Alterações) */
    const handleAbrirGerarContratoDaVenda = (venda: Venda) => {
        setContratoVendaId(venda.id);
        setTipoContratoModal(null);
        setConteudoContrato((venda as any).contratoHtml || getContratoComReplacesFromVenda(venda));
        setActiveTabContrato('design');
        setModalContratoOpen(true);
    };

    /** Bloco de assinaturas: data, linhas e nomes do contratante (cliente) e da contratada (empresa S3E). No subestação usa gap 2px menor entre linha e nome. */
    const renderAssinaturaContratoModelo = (vals: ContratoResolvedValues, tipoContrato?: 'simplificado' | 'subestacao' | null) => (
        <div className={`contrato-assinatura-modelo no-break contrato-preview-document${tipoContrato === 'subestacao' ? ' contrato-assinatura-modelo--subestacao' : ''}`}>
            <p className="contrato-data-local">{`Itajaí, ${vals.dataGeracao}.`}</p>
            <div className="contrato-assinaturas">
                <div className="contrato-assinatura-bloco">
                    <div className="contrato-assinatura-linha" aria-label="Assinatura do contratante" />
                    <p className="contrato-assinatura-nome">{vals.cliente}</p>
                    {(() => {
                        const norm = normalizeCnpj(vals.cpfCnpjCliente);
                        const label = norm.length === 11 ? 'CPF' : norm.length === 14 ? 'CNPJ' : 'CPF/CNPJ';
                        const valor = vals.cpfCnpjCliente || '—';
                        return <p className="contrato-assinatura-ident">{`${label}: ${valor}`}</p>;
                    })()}
                    <p className="contrato-assinatura-rotulo">CONTRATANTE</p>
                </div>
                <div className="contrato-assinatura-bloco">
                    <div className="contrato-assinatura-linha" aria-label="Assinatura da contratada" />
                    <p className="contrato-assinatura-nome">{vals.empresa}</p>
                    <p className="contrato-assinatura-ident">{`CNPJ: ${vals.cnpjS3E || '—'}`}</p>
                    <p className="contrato-assinatura-rotulo">CONTRATADA</p>
                </div>
            </div>
        </div>
    );

    // Carregar folhas timbradas quando o modal de contrato abrir
    useEffect(() => {
        if (!modalContratoOpen) return;
        let cancelled = false;
        setLoadingFolhasContrato(true);
        pdfCustomizationService.listFolhasTimbradas()
            .then(res => {
                if (!cancelled && res.success && res.data) setFolhasTimbradasContrato(Array.isArray(res.data) ? res.data : []);
                else if (!cancelled) setFolhasTimbradasContrato([]);
            })
            .catch(() => { if (!cancelled) setFolhasTimbradasContrato([]); })
            .finally(() => { if (!cancelled) setLoadingFolhasContrato(false); });
        return () => { cancelled = true; };
    }, [modalContratoOpen]);

    const handleSubmitVenda = async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }
        if (!orcamentoSelecionado) {
            toast.error('Selecione um orçamento para realizar a venda');
            return;
        }

        const statusOrcamento = orcamentoSelecionado.status?.toString() || '';
        const isOrcamentoAprovado =
            statusOrcamento === 'Aprovado' || statusOrcamento.toLowerCase() === 'aprovado';
        if (!isOrcamentoAprovado) {
            toast.error('Apenas orçamentos com status "Aprovado" podem gerar pedido de venda.');
            console.warn('⚠️ Tentativa de criar venda sem orçamento aprovado:', {
                orcamentoId: orcamentoSelecionado.id,
                status: orcamentoSelecionado.status,
            });
            return;
        }

        setIsSubmitting(true);
        setError(null);
        let loadingToastId: string | number | undefined;

        try {
            console.log('💰 Realizando nova venda...', vendaForm);

            // Validação adicional: À vista sempre 1 parcela
            if (vendaForm.formaPagamento === 'À vista' && vendaForm.parcelas !== 1) {
                toast.error('Vendas à vista devem ter apenas 1 parcela');
                return;
            }

            // Boleto parcelado: validar que todas as datas das parcelas foram preenchidas
            if (vendaForm.formaPagamento === 'Boleto parcelado') {
                const n = vendaForm.parcelas || 1;
                const datas = vendaForm.datasParcelas || [];
                if (datas.length < n || datas.some(d => !d)) {
                    toast.error('Preencha a data de vencimento de cada parcela do boleto parcelado.');
                    return;
                }
            }
            // Valores manuais: última parcela (restante) deve ser positiva
            if (!vendaForm.parcelasIguais && vendaForm.parcelas > 1 && calculosFinanceiros.valoresPorParcela?.length) {
                const ultima = calculosFinanceiros.valoresPorParcela[vendaForm.parcelas - 1];
                if (ultima <= 0) {
                    toast.error('A soma dos valores das parcelas manuais não pode superar o valor a parcelar. Ajuste os valores para que a última parcela (restante) seja positiva.');
                    return;
                }
            }

            // Valor total da venda (PV/financeiro): usar "valor a receber" (exclui itens venda direta fornecedor).
            // O backend também aplica essa regra; aqui é para exibir/confirmar com o usuário sem confusão.
            const valorTotalVenda = calculosFinanceiros.valorTotal;

            // Boleto integral: 1 parcela, data de cobrança = dataCobrancaBoleto (padrão: hoje)
            const dataPrimeiraParcelaEnvio = vendaForm.formaPagamento === 'Boleto integral'
                ? (vendaForm.dataCobrancaBoleto || hojeISO())
                : vendaForm.dataPrimeiraParcela;

            const vendaData: Record<string, unknown> = {
                orcamentoId: vendaForm.orcamentoId,
                clienteId: orcamentoSelecionado.clienteId,
                valorTotal: valorTotalVenda,
                formaPagamento: vendaForm.formaPagamento,
                parcelas: vendaForm.formaPagamento === 'Boleto integral' ? 1 : vendaForm.parcelas,
                valorEntrada: vendaForm.formaPagamento === 'Boleto integral' ? 0 : vendaForm.valorEntrada,
                valorFinanciado: Math.max(0, valorTotalVenda - (vendaForm.formaPagamento === 'Boleto integral' ? 0 : (vendaForm.valorEntrada || 0))),
                dataVencimentoPrimeiraParcela: dataPrimeiraParcelaEnvio,
                observacoes: vendaForm.observacoes?.trim() || undefined,
                itensModificados: itensOrcamentoModificados ? true : false
            };
            if (vendaForm.formaPagamento === 'Boleto parcelado' && (vendaForm.datasParcelas?.length || 0) > 0) {
                vendaData.datasParcelas = vendaForm.datasParcelas;
            }
            // Valores manuais por parcela (última = restante)
            if (!vendaForm.parcelasIguais && calculosFinanceiros.valoresPorParcela?.length === (vendaForm.formaPagamento === 'Boleto integral' ? 0 : vendaForm.parcelas)) {
                vendaData.valoresParcelas = calculosFinanceiros.valoresPorParcela;
            }

            console.log('📤 Enviando dados da venda:', vendaData);

            // Validar NCM em kits: impedir envio se kit sem NCM
            const itensParaValidar = vendaData.items || [];
            const kitSemNcm = (itensParaValidar as any[]).find(it => (it.tipo === 'KIT' || it.tipo === 'Kit' || (it as any).itensDoKit) && !(it.ncm || (it as any).ncm));
            if (kitSemNcm) {
                const kitNome = (kitSemNcm as any).nome || 'Kit sem nome';
                toast.error('Preencha o NCM do kit antes de gerar a venda', { description: `Kit: ${kitNome}` });
                setIsSubmitting(false);
                return;
            }

            loadingToastId = toast.loading('Registrando pedido de venda…', {
                description: 'Finalizando no servidor; pode levar alguns segundos.',
            });

            const response = await vendasService.realizarVenda(vendaData as any);

            console.log('📥 Resposta do servidor:', response);

            if (response.success) {
                console.log('✅ Venda realizada com sucesso');
                toast.success(response.message || '✅ Venda registrada com sucesso!', { id: loadingToastId });
                
                // Resetar formulário
                setVendaForm({
                    orcamentoId: '',
                    formaPagamento: 'À vista',
                    parcelas: 1,
                    valorEntrada: 0,
                    parcelasIguais: true,
                    valoresParcelas: [],
                    observacoes: '',
                    dataPrimeiraParcela: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    dataCobrancaBoleto: hojeISO(),
                    datasParcelas: [],
                });
                
                // Recarregar dados
                await loadData();
                setActiveTab('lista');
            } else {
                const errorMsg = (response as any).error || 'Erro ao registrar venda';
                console.warn('⚠️ Erro ao realizar venda:', errorMsg);
                setError(errorMsg);
                
                // Verificar se é erro de venda duplicada
                if (errorMsg.includes('Já existe uma venda')) {
                    toast.error('Venda Duplicada', {
                        id: loadingToastId,
                        description: errorMsg,
                        duration: 7000
                    });
                } else {
                    toast.error(`❌ ${errorMsg}`, { id: loadingToastId });
                }
            }
        } catch (err: any) {
            console.error('❌ Erro crítico ao realizar venda:', err);
            const errorMsg = err?.response?.data?.error || err?.message || 'Erro de conexão ao registrar venda';
            setError(errorMsg);
            
            if (errorMsg.includes('Já existe uma venda')) {
                toast.error('Venda Duplicada', {
                    id: loadingToastId,
                    description: errorMsg,
                    duration: 7000
                });
            } else {
                toast.error(`❌ ${errorMsg}`, { id: loadingToastId });
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
                description: (response as any).error || 'Não foi possível excluir a venda'
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
                        ncm: item.ncm || item.cotacao?.ncm || item.material?.ncm || '', // ✅ NCM para faturamento
                        custoUnit: item.custoUnitario || item.custoUnit || item.material?.preco || 0,
                        // Usar valorVenda do material se disponível, senão usar precoUnit do orçamento
                        precoUnit: item.material?.valorVenda || item.precoUnitario || item.precoUnit || 0,
                        subtotal: item.subtotal || ((item.material?.valorVenda || item.precoUnitario || item.precoUnit || 0) * (item.quantidade || 1)),
                    })) || [];

                    // Calcular valor total se não existir
                    const subtotalItens = items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
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
                        dataVencimentoPrimeiraParcela: (venda as any).dataVencimentoPrimeiraParcela,
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
            {/* Cards de Estatísticas - ícones compatíveis com cada métrica */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 flex items-center justify-center">
                            <CircleDollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Faturamento do Mês</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                R$ {(estatisticasVendas.faturamentoMes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center">
                            <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vendas no Mês</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{estatisticasVendas.vendasMes || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 flex items-center justify-center">
                            <Receipt className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ticket Médio</p>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                R$ {(estatisticasVendas.ticketMedio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 flex items-center justify-center">
                            <Target className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Meta do Mês</p>
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                R$ {(estatisticasVendas.metaMes || 100000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Bar da Meta — mês atual vs meta do mês (gráfico abaixo continua 6 meses) */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft dark:bg-gray-800 dark:border-gray-700">
                <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Progresso da Meta Mensal</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{estatisticasVendas.mesLabel}</p>
                    </div>
                    <span className={`text-lg font-bold ${estatisticasVendas.percentualMeta >= 100 ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        {estatisticasVendas.percentualMeta.toFixed(1)}%
                    </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-5 mt-3">
                    <div 
                        className={`h-5 rounded-full transition-all duration-500 ${
                            estatisticasVendas.percentualMeta >= 100 
                                ? 'bg-gradient-to-r from-green-500 to-green-600' 
                                : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}
                        style={{ width: `${Math.min(estatisticasVendas.percentualMeta, 100)}%` }}
                    />
                </div>
                <div className="flex justify-between mt-3 text-sm">
                    <span className="text-gray-600 dark:text-gray-300">
                        <span className="block text-xs text-gray-500 dark:text-gray-400">Faturamento no mês</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                            R$ {estatisticasVendas.faturamentoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </span>
                    <span className="text-right text-gray-600 dark:text-gray-300">
                        <span className="block text-xs text-gray-500 dark:text-gray-400">Meta do mês</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                            R$ {estatisticasVendas.metaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </span>
                </div>
                {estatisticasVendas.percentualMeta >= 100 && (
                    <div className="mt-4 bg-green-100 border border-green-300 p-3 rounded-lg dark:bg-green-900/30 dark:border-green-700">
                        <p className="text-sm text-green-800 dark:text-green-300 font-semibold text-center">
                            🎉 Parabéns! Meta do mês alcançada!
                        </p>
                    </div>
                )}
            </div>

            {/* Gráfico: Faturamento nos últimos 6 meses */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft dark:bg-gray-800 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">Faturamento nos últimos 6 meses</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataVendas} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
                            <XAxis dataKey="mes" tick={{ fontSize: 12 }} className="text-gray-600 dark:text-gray-400" />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-gray-600 dark:text-gray-400" />
                            <Tooltip
                                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Faturamento']}
                                labelFormatter={(label) => `Mês: ${label}`}
                                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}
                            />
                            <Bar dataKey="faturamento" fill="#10b981" radius={[4, 4, 0, 0]} name="Faturamento" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Vendas Recentes - mesmo design de tabela da aba Lista de Vendas */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-soft dark:bg-gray-800 dark:border-gray-700" style={{ overflow: 'visible', position: 'relative' }}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text px-6 pt-6 pb-4">Vendas Recentes</h3>
                <div className="overflow-x-auto" style={{ overflowY: 'visible' }}>
                    {vendas.length > 0 ? (
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 border-b border-gray-200 dark:border-gray-600">
                                <tr>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase w-16">Nº</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Cliente</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Título</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Valor</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Data</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Status</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase w-24">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                {vendasOrdenadas.slice(0, 5).map((venda, index) => {
                                    const statusExibicao = getStatusExibicao(venda);
                                    const statusClasse =
                                        statusExibicao === 'Faturado'
                                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 ring-1 ring-orange-200 dark:ring-orange-700'
                                            : statusExibicao === 'Concluida'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 ring-1 ring-green-200 dark:ring-green-700'
                                                : statusExibicao === 'Pago Parcial'
                                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 ring-1 ring-yellow-200 dark:ring-yellow-700'
                                                    : statusExibicao === 'Pendente'
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-700'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-700';
                                    return (
                                        <tr key={venda.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                                                    N{(venda as any).numeroSequencial ?? (vendasOrdenadas.length - index)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-900 dark:text-dark-text">{venda.cliente?.nome || 'N/A'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-gray-900 dark:text-dark-text">{venda.orcamento?.titulo || 'Projeto'}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">#{(venda as any).numeroVenda || venda.id?.slice(0, 8) || '—'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                                    R$ {(venda.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <p className="text-sm text-gray-900 dark:text-dark-text">{new Date(venda.dataVenda).toLocaleDateString('pt-BR')}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 text-xs font-bold rounded-lg ${statusClasse}`}>
                                                    {statusExibicao === 'Concluida' && '✅ '}
                                                    {statusExibicao === 'Faturado' && '📄 '}
                                                    {statusExibicao === 'Pago Parcial' && '💳 '}
                                                    {statusExibicao === 'Pendente' && '⏳ '}
                                                    {statusExibicao === 'Cancelada' && '❌ '}
                                                    {statusExibicao}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => abrirModalVisualizarVendaCompleto(venda)}
                                                    className="px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-all font-semibold flex items-center gap-1 mx-auto text-sm"
                                                    title="Visualizar"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                    Ver
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400 px-6">
                            <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">Nenhuma venda encontrada</p>
                            <p className="text-sm mt-1">As vendas aparecerão aqui quando forem criadas</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderNovaVenda = () => (
        <div className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-2xl shadow-soft max-w-7xl mx-auto">
            {/* Header */}
            <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-slate-900">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-medium">
                        {/* Ícone simples (evita bugs de renderização do SVG em alguns ambientes) */}
                        <span className="text-3xl font-bold text-white" aria-hidden>
                            $
                        </span>
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
                className="p-6 space-y-6 dark:text-dark-text"
            >
                {/* SEÇÃO 1: Seleção de Orçamento - Layout Otimizado */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-300">📋</span>
                        Seleção do Orçamento/Projeto
                    </h3>
                    
                    {orcamentosAprovados.length === 0 ? (
                        <div className="bg-orange-50 dark:bg-orange-950/40 border-2 border-orange-300 dark:border-orange-800 rounded-xl p-6 flex items-start gap-3">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <p className="text-sm font-semibold text-orange-900 dark:text-orange-200 mb-1">
                                    Nenhum Orçamento Aprovado Disponível
                                </p>
                                <p className="text-xs text-orange-700 dark:text-orange-300/90">
                                    Para criar uma venda, você precisa primeiro aprovar um orçamento na página de <strong>Orçamentos</strong>. Vá até lá, selecione um orçamento em status "Pendente" e aprove-o para que ele apareça aqui.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Painel de Busca e Filtros - Lado Esquerdo */}
                            <div className="lg:col-span-1 space-y-4">
                                <div className="bg-slate-50 dark:bg-slate-800/80 border-2 border-blue-200 dark:border-slate-600 rounded-xl p-5">
                                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-4 flex items-center gap-2">
                                        <MagnifyingGlassIcon className="w-5 h-5" />
                                        Buscar Orçamento
                                    </h4>
                                    
                                    {/* Campo de Busca */}
                                    <div className="mb-4">
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            🔍 Pesquisar
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={buscaOrcamento}
                                                onChange={(e) => setBuscaOrcamento(e.target.value)}
                                                placeholder="Título, cliente, número..."
                                                className="w-full px-4 py-3 pl-10 border-2 border-blue-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-dark-text"
                                            />
                                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                                        </div>
                                    </div>

                                    {/* Filtro por Cliente */}
                                    {clientesUnicos.length > 0 && (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                👤 Filtrar por Cliente
                                            </label>
                                            <select
                                                value={filtroCliente}
                                                onChange={(e) => setFiltroCliente(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-blue-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-dark-text"
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
                                    <div className="mt-4 pt-4 border-t border-blue-200 dark:border-slate-600">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-600 dark:text-gray-400">Total encontrado:</span>
                                            <span className="font-bold text-blue-700 dark:text-blue-300">{orcamentosFiltrados.length} de {orcamentosAprovados.length}</span>
                                        </div>
                                    </div>
                                </div>

                                {!vendaForm.orcamentoId && (
                                    <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-800 rounded-xl p-4">
                                        <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
                                            💡 <strong>Dica:</strong> Use a busca para encontrar rapidamente o orçamento desejado. Clique em um card para selecionar.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Lista de Orçamentos - Lado Direito */}
                            <div className="lg:col-span-2">
                                <div className="bg-white dark:bg-slate-800/60 border-2 border-gray-200 dark:border-slate-600 rounded-xl p-4">
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
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
                                                const hasVenda = orcamentosComVendaIds.has(orcamento.id);
                                                return (
                                                    <div
                                                        key={orcamento.id}
                                                        onClick={() => { if (!hasVenda) setVendaForm({...vendaForm, orcamentoId: orcamento.id}); }}
                                                        className={`p-4 rounded-xl border-2 transition-all ${hasVenda ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-slate-900 border-gray-200 dark:border-slate-700' : 'cursor-pointer hover:shadow-md'} ${
                                                            isSelecionado
                                                                ? 'bg-green-50 dark:bg-green-950/40 border-green-400 dark:border-green-600 shadow-md'
                                                                : (hasVenda ? 'bg-gray-100 dark:bg-slate-900 border-gray-200 dark:border-slate-700' : 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-600 hover:border-green-300 dark:hover:border-green-700')
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <h5 className={`font-bold text-lg truncate ${isSelecionado ? 'text-green-800 dark:text-green-300' : 'text-gray-900 dark:text-dark-text'}`}>
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
                                                                        <span className="text-gray-600 dark:text-gray-400">Cliente:</span>
                                                                        <p className="font-semibold text-gray-900 dark:text-gray-100">{orcamento.cliente?.nome || 'N/A'}</p>
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
                                                                {(() => {
                                                                    const valorAReceber = calcularValorAReceberDoOrcamento(orcamento as any);
                                                                    const valorVendaDireta = calcularValorVendaDiretaDoOrcamento(orcamento as any);
                                                                    const totalCliente = Number(orcamento.precoVenda) || 0;
                                                                    const temVendaDireta = valorVendaDireta > 0.009 && totalCliente > valorAReceber + 0.009;
                                                                    return (
                                                                        <div className="text-2xl font-bold text-green-600 leading-tight">
                                                                            <span className="block">
                                                                                R$ {valorAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </span>
                                                                            {temVendaDireta && (
                                                                                <span className="block text-xs font-medium text-gray-500">
                                                                                    Total cliente: R$ {totalCliente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                                <div className="mt-2 flex items-center gap-2">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (!hasVenda) setVendaForm({...vendaForm, orcamentoId: orcamento.id});
                                                                        }}
                                                                        disabled={hasVenda}
                                                                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                                                            isSelecionado
                                                                                ? 'bg-green-600 text-white'
                                                                                : (hasVenda ? 'bg-gray-200 text-gray-600 cursor-not-allowed' : 'bg-green-100 text-green-700 hover:bg-green-200')
                                                                        }`}
                                                                    >
                                                                        {hasVenda ? 'Pedido criado' : (isSelecionado ? '✓ Selecionado' : 'Selecionar')}
                                                                    </button>
                                                                    {hasVenda && (() => {
                                                                        const vendaAssociada = (vendas || []).find((v: any) => v.orcamentoId === orcamento.id);
                                                                        if (!vendaAssociada) return null;
                                                                        return (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    abrirModalVisualizarVenda(vendaAssociada);
                                                                                }}
                                                                                className="px-3 py-2 rounded-lg text-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
                                                                            >
                                                                                Ver pedido
                                                                            </button>
                                                                        );
                                                                    })()}
                                                                </div>
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
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-300">🏢</span>
                            Informações do Projeto (Herdadas)
                        </h3>
                        <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-purple-200 dark:border-slate-600 rounded-xl p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-600 p-4 rounded-lg">
                                    <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase mb-1">Cliente</h4>
                                    <p className="text-gray-900 dark:text-gray-100 font-medium">{orcamentoSelecionado.cliente?.nome || 'N/A'}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{orcamentoSelecionado.cliente?.email || ''}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-600 p-4 rounded-lg">
                                    <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase mb-1">Projeto</h4>
                                    <p className="text-gray-900 dark:text-gray-100 font-medium">{orcamentoSelecionado.titulo || 'Projeto'}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Nº Orçamento: {orcamentoSelecionado.numeroOrcamento || orcamentoSelecionado.id?.slice(0, 8)}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-600 p-4 rounded-lg">
                                    <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase mb-1">Status</h4>
                                    <span className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-xs font-bold rounded-lg">
                                        ✅ Aprovado
                                    </span>
                                </div>
                                <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-600 p-4 rounded-lg">
                                    <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase mb-1">Endereço da Obra</h4>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">{orcamentoSelecionado.enderecoObra || orcamentoSelecionado.cliente?.endereco || 'Não especificado'}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-600 p-4 rounded-lg">
                                    <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase mb-1">Tipo de Projeto</h4>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">{orcamentoSelecionado.tipoInstalacao || 'Instalação Elétrica'}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-600 p-4 rounded-lg">
                                    <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase mb-1">Itens/Serviços</h4>
                                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">{orcamentoSelecionado.items?.length || 0} item(s)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SEÇÃO 3: Condições Financeiras (Inputs Ativos) */}
                {orcamentoSelecionado && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-300">💰</span>
                            Condições Financeiras
                        </h3>
                        <div className="bg-white dark:bg-slate-800/40 border border-gray-200 dark:border-slate-600 rounded-xl p-6 space-y-6">
                            {/* Valor Total (Read-Only) e breakdown quando há desconto */}
                            <div className="space-y-3">
                                {(orcamentoSelecionado?.descontoValor ?? 0) > 0 && (
                                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-2">
                                        <p className="text-xs font-semibold text-gray-700 uppercase mb-2">Composição do valor (orçamento com desconto)</p>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Valor do orçamento (subtotal dos itens)</span>
                                            <span className="font-semibold text-gray-900">R$ {((orcamentoSelecionado?.items || []).reduce((s: number, it: any) => s + (Number(it.subtotal) || 0), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-amber-700">
                                            <span>Desconto</span>
                                            <span className="font-semibold">- R$ {(orcamentoSelecionado?.descontoValor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                                            <span className="font-semibold text-gray-800">Total cliente (orçamento)</span>
                                            <span className="font-bold text-gray-900">R$ {(orcamentoSelecionado?.precoVenda ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        {calcularValorVendaDiretaDoOrcamento(orcamentoSelecionado as any) > 0.009 && (
                                            <div className="flex justify-between text-sm text-amber-800">
                                                <span>Venda direta (fora do PV)</span>
                                                <span className="font-semibold">- R$ {calcularValorVendaDiretaDoOrcamento(orcamentoSelecionado as any).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                                            <span className="font-semibold text-gray-800">Valor a receber (PV/Financeiro)</span>
                                            <span className="font-bold text-gray-900">R$ {calcularValorAReceberDoOrcamento(orcamentoSelecionado as any).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        {itensOrcamentoModificados && itensOrcamentoModificados.length > 0 && (
                                            <p className="text-xs text-amber-800 mt-2 pt-2 border-t border-amber-200">
                                                O valor total do pedido é o valor final do orçamento (com desconto aplicado), mesmo ao unificar itens em kit.
                                            </p>
                                        )}
                                    </div>
                                )}
                                <div className="bg-green-50 dark:bg-green-950/30 border-2 border-green-300 dark:border-green-800 p-6 rounded-xl">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 uppercase mb-1">Valor Total do Projeto</h4>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">Valor herdado do orçamento aprovado{(orcamentoSelecionado?.descontoValor ?? 0) > 0 ? ' (já com desconto)' : ''}</p>
                                        </div>
                                        <p className="text-4xl font-bold text-green-700 dark:text-green-400">
                                            R$ {calculosFinanceiros.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Lista de Itens/Serviços (Read-Only) */}
                            {orcamentoSelecionado?.items && orcamentoSelecionado.items.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                            <span className="text-green-600">📦</span>
                                            Itens/Serviços do Orçamento ({(itensOrcamentoModificados || orcamentoSelecionado.items).length})
                                        </h4>
                                        {/* Botões de seleção e criar kit */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={selecionarTodosItensVenda}
                                                className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition-colors"
                                            >
                                                Selecionar Todos
                                            </button>
                                            {itensSelecionadosVenda.size > 0 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={deselecionarTodosItensVenda}
                                                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                    >
                                                        Desmarcar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCriarKitModalVenda(true)}
                                                        className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-1"
                                                    >
                                                        <span>📦</span>
                                                        Criar Kit ({itensSelecionadosVenda.size})
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden">
                                        {/* Header da Tabela */}
                                        <div className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-600 px-6 py-3 grid grid-cols-12 gap-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                            <div className="col-span-1"></div>
                                            <div className="col-span-3">Item/Serviço</div>
                                            <div className="col-span-1 text-center">NCM</div>
                                            <div className="col-span-2 text-center">Quantidade</div>
                                            <div className="col-span-2 text-right">Valor Unit.</div>
                                            <div className="col-span-3 text-right">Subtotal</div>
                                        </div>
                                        
                                        {/* Linhas de Itens */}
                                        <div className="divide-y divide-gray-200 dark:divide-slate-600">
                                            {(itensOrcamentoModificados || orcamentoSelecionado.items).map((item: any, index: number) => {
                                                const nomeItem = getItemNomeVenda(item);
                                                const dataFrio = getItemDataBancoFrioVenda(item);
                                                const isBancoFrio = getItemTipoVenda(item) === 'COTACAO' || getItemTipoVenda(item) === 'BANCO_FRIO' || item.cotacaoId || item.cotacao;
                                                // Obter NCM: prioridade para item (manual) > cotação > material
                                                const ncm = item.ncm || item.cotacao?.ncm || item.material?.ncm || '-';
                                                return (
                                                <div key={index} className={`px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${itensSelecionadosVenda.has(index) ? 'bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-500' : ''}`}>
                                                    {/* Checkbox de seleção */}
                                                    <div className="col-span-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={itensSelecionadosVenda.has(index)}
                                                            onChange={() => toggleItemSelecionadoVenda(index)}
                                                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{nomeItem}</p>
                                                            {(item.tipo === 'KIT' || item.tipo === 'Kit') && item.itensDoKit && Array.isArray(item.itensDoKit) && item.itensDoKit.length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setItensKitParaVisualizarVenda(item.itensDoKit);
                                                                        setNomeKitParaVisualizarVenda(item.nome || item.descricao || 'Kit');
                                                                        setShowModalItensKitVenda(true);
                                                                    }}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-700 bg-teal-100 hover:bg-teal-200 rounded-lg transition-colors"
                                                                    title="Ver itens do kit"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /></svg>
                                                                    Ver itens do kit
                                                                </button>
                                                            )}
                                                        </div>
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
                                                        {/* Flag Venda direta fornecedor (não soma ao valor do PV) */}
                                                        {item.vendaDiretaFornecedor && (
                                                            <div className="mt-1 inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-medium" title="Não entra em contas a receber, estoque nem NF-e">
                                                                Venda direta fornecedor
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
                                                            return precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
                                                                return subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>

                                        {/* Footer com Total (e breakdown de desconto quando houver) */}
                                        <div className="bg-green-50 dark:bg-green-950/25 border-t-2 border-green-300 dark:border-green-800 px-6 py-4 space-y-2">
                                            {(orcamentoSelecionado?.descontoValor ?? 0) > 0 && (() => {
                                                const itensAtuais = itensOrcamentoModificados || orcamentoSelecionado?.items || [];
                                                const subtotalItens = itensAtuais.reduce((s: number, it: any) => s + (Number(it.subtotal) || 0), 0);
                                                const desconto = orcamentoSelecionado?.descontoValor ?? 0;
                                                return (
                                                    <>
                                                        <div className="flex justify-between items-center text-sm text-gray-600">
                                                            <span>Subtotal dos itens{(itensOrcamentoModificados ? ' (modificado)' : '')}</span>
                                                            <span className="font-semibold">R$ {subtotalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm text-amber-700">
                                                            <span>Desconto (orçamento)</span>
                                                            <span className="font-semibold">- R$ {desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                            <div className="flex justify-between items-center pt-1 border-t border-green-200 dark:border-green-800">
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                    {(orcamentoSelecionado?.descontoValor ?? 0) > 0 ? 'Valor total do pedido (com desconto)' : `TOTAL DOS ITENS${itensOrcamentoModificados ? ' (Modificado)' : ''}`}
                                                </span>
                                                <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                                                    R$ {calculosFinanceiros.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Inputs de Pagamento */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Forma de Pagamento *
                                    </label>
                                    <select
                                        value={vendaForm.formaPagamento}
                                        onChange={(e) => setVendaForm({...vendaForm, formaPagamento: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-dark-text"
                                    >
                                        {formasPagamento.map(forma => (
                                            <option key={forma} value={forma}>{forma}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Boleto integral: apenas data para cobrança (padrão: hoje) */}
                                {vendaForm.formaPagamento === 'Boleto integral' && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Data para cobrança *
                                        </label>
                                        <input
                                            type="date"
                                            value={vendaForm.dataCobrancaBoleto || hojeISO()}
                                            onChange={(e) => setVendaForm({...vendaForm, dataCobrancaBoleto: e.target.value})}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-dark-text"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Data em que o boleto será cobrado (padrão: hoje)</p>
                                    </div>
                                )}

                                {/* Boleto parcelado: parcelas + data 1ª parcela + valor entrada + datas de cada parcela */}
                                {vendaForm.formaPagamento === 'Boleto parcelado' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Número de Parcelas *
                                            </label>
                                            <input
                                                type="number"
                                                value={vendaForm.parcelas}
                                                onChange={(e) => setVendaForm({...vendaForm, parcelas: Math.max(1, Number(e.target.value) || 1)})}
                                                min="1"
                                                max="36"
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-dark-text"
                                            />
                                        </div>
                                        {vendaForm.parcelas > 1 && (
                                            <>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Distribuição dos valores</label>
                                                    <div className="flex flex-wrap gap-4 items-center">
                                                        <label className="inline-flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="parcelasTipo"
                                                                checked={vendaForm.parcelasIguais}
                                                                onChange={() => setVendaForm(prev => ({ ...prev, parcelasIguais: true, valoresParcelas: [] }))}
                                                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                            />
                                                            <span className="text-sm">Parcelas iguais</span>
                                                        </label>
                                                        <label className="inline-flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="parcelasTipo"
                                                                checked={!vendaForm.parcelasIguais}
                                                                onChange={() => setVendaForm(prev => ({ ...prev, parcelasIguais: false }))}
                                                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                            />
                                                            <span className="text-sm">Valores manuais por parcela</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                {!vendaForm.parcelasIguais && (
                                                    <div className="md:col-span-2">
                                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Valor de cada parcela (R$) — última = restante</label>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                            {Array.from({ length: Math.max(0, vendaForm.parcelas - 1) }).map((_, idx) => (
                                                                <div key={idx}>
                                                                    <label className="block text-xs text-gray-500 mb-1">Parcela {idx + 1}</label>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        value={vendaForm.valoresParcelas?.[idx] ?? ''}
                                                                        onChange={(e) => {
                                                                            const v = parseFloat(e.target.value) || 0;
                                                                            setVendaForm(prev => {
                                                                                const arr = [...(prev.valoresParcelas || [])];
                                                                                arr[idx] = v;
                                                                                return { ...prev, valoresParcelas: arr };
                                                                            });
                                                                        }}
                                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                                                    />
                                                                </div>
                                                            ))}
                                                            <div>
                                                                <label className="block text-xs text-gray-500 mb-1">Parcela {vendaForm.parcelas} (restante)</label>
                                                                <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">
                                                                    R$ {(calculosFinanceiros.valoresPorParcela?.[vendaForm.parcelas - 1] ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Valor de Entrada (R$)
                                            </label>
                                            <input
                                                type="number"
                                                value={vendaForm.valorEntrada}
                                                onChange={(e) => setVendaForm({...vendaForm, valorEntrada: Number(e.target.value)})}
                                                min="0"
                                                max={calculosFinanceiros.valorTotal}
                                                step="0.01"
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-dark-text"
                                                placeholder="0,00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Data da Primeira Parcela *
                                            </label>
                                            <input
                                                type="date"
                                                value={vendaForm.dataPrimeiraParcela}
                                                onChange={(e) => {
                                                    const nova = e.target.value;
                                                    setVendaForm(prev => ({
                                                        ...prev,
                                                        dataPrimeiraParcela: nova,
                                                        datasParcelas: prev.datasParcelas?.length ? [nova, ...(prev.datasParcelas?.slice(1) || [])] : [nova]
                                                    }));
                                                }}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-dark-text"
                                            />
                                        </div>
                                        {/* Datas de vencimento das parcelas (já existe uma data dedicada para a 1ª parcela) */}
                                        {(vendaForm.parcelas || 1) > 1 && (
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                    Datas de vencimento das parcelas (2 a {vendaForm.parcelas})
                                                </label>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                    {(vendaForm.datasParcelas || []).slice(1).map((dataParcela, idx) => {
                                                        const numeroParcela = idx + 2;
                                                        return (
                                                            <div key={numeroParcela}>
                                                                <label className="block text-xs text-gray-500 mb-1">Parcela {numeroParcela}</label>
                                                                <input
                                                                    type="date"
                                                                    value={dataParcela}
                                                                    onChange={(e) => setVendaForm(prev => {
                                                                        const arr = [...(prev.datasParcelas || [])];
                                                                        arr[numeroParcela - 1] = e.target.value;
                                                                        return { ...prev, datasParcelas: arr };
                                                                    })}
                                                                    required
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* À vista / Cartão: parcelas (1 para à vista) e data primeira parcela e valor entrada */}
                                {(vendaForm.formaPagamento === 'À vista' || vendaForm.formaPagamento === 'Cartão de crédito') && (
                                    <>
                                        {vendaForm.formaPagamento === 'Cartão de crédito' && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                        Número de Parcelas *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={vendaForm.parcelas}
                                                        onChange={(e) => setVendaForm({...vendaForm, parcelas: Math.max(1, Number(e.target.value) || 1)})}
                                                        min="1"
                                                        max="36"
                                                        required
                                                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-dark-text"
                                                    />
                                                </div>
                                                {vendaForm.parcelas > 1 && (
                                                    <>
                                                        <div className="md:col-span-2">
                                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Distribuição dos valores</label>
                                                            <div className="flex flex-wrap gap-4 items-center">
                                                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                                                    <input
                                                                        type="radio"
                                                                        name="parcelasTipoCartao"
                                                                        checked={vendaForm.parcelasIguais}
                                                                        onChange={() => setVendaForm(prev => ({ ...prev, parcelasIguais: true, valoresParcelas: [] }))}
                                                                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                                    />
                                                                    <span className="text-sm">Parcelas iguais</span>
                                                                </label>
                                                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                                                    <input
                                                                        type="radio"
                                                                        name="parcelasTipoCartao"
                                                                        checked={!vendaForm.parcelasIguais}
                                                                        onChange={() => setVendaForm(prev => ({ ...prev, parcelasIguais: false }))}
                                                                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                                    />
                                                                    <span className="text-sm">Valores manuais por parcela</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                        {!vendaForm.parcelasIguais && (
                                                            <div className="md:col-span-2">
                                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Valor de cada parcela (R$) — última = restante</label>
                                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                                    {Array.from({ length: Math.max(0, vendaForm.parcelas - 1) }).map((_, idx) => (
                                                                        <div key={idx}>
                                                                            <label className="block text-xs text-gray-500 mb-1">Parcela {idx + 1}</label>
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                step="0.01"
                                                                                value={vendaForm.valoresParcelas?.[idx] ?? ''}
                                                                                onChange={(e) => {
                                                                                    const v = parseFloat(e.target.value) || 0;
                                                                                    setVendaForm(prev => {
                                                                                        const arr = [...(prev.valoresParcelas || [])];
                                                                                        arr[idx] = v;
                                                                                        return { ...prev, valoresParcelas: arr };
                                                                                    });
                                                                                }}
                                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                    <div>
                                                                        <label className="block text-xs text-gray-500 mb-1">Parcela {vendaForm.parcelas} (restante)</label>
                                                                        <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200">
                                                                            R$ {(calculosFinanceiros.valoresPorParcela?.[vendaForm.parcelas - 1] ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        )}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Valor de Entrada (R$)
                                            </label>
                                            <input
                                                type="number"
                                                value={vendaForm.valorEntrada}
                                                onChange={(e) => setVendaForm({...vendaForm, valorEntrada: Number(e.target.value)})}
                                                min="0"
                                                max={calculosFinanceiros.valorTotal}
                                                step="0.01"
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-dark-text"
                                                placeholder="0,00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                Data da Primeira Parcela *
                                            </label>
                                            <input
                                                type="date"
                                                value={vendaForm.dataPrimeiraParcela}
                                                onChange={(e) => setVendaForm({...vendaForm, dataPrimeiraParcela: e.target.value})}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-dark-text"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Cálculos Automáticos (ocultar para Boleto integral; mostrar para parcelado e demais) */}
                            {vendaForm.formaPagamento !== 'Boleto integral' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                                    <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase mb-1">Valor de Venda</h4>
                                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                                        R$ {calculosFinanceiros.valorFinanciado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        Total - Entrada = Valor a parcelar
                                    </p>
                                </div>

                                <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-4 rounded-xl">
                                    <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase mb-1">Valor da Parcela</h4>
                                    {vendaForm.parcelasIguais || !calculosFinanceiros.valoresPorParcela?.length ? (
                                        <>
                                            <p className="text-2xl font-bold text-purple-900 dark:text-purple-200">
                                                R$ {calculosFinanceiros.valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-xs text-gray-600 mt-1">
                                                {vendaForm.parcelas}x de R$ {calculosFinanceiros.valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm font-bold text-purple-900 mb-1">Valores manuais</p>
                                            <div className="text-xs text-gray-600 space-y-0.5">
                                                {(calculosFinanceiros.valoresPorParcela || []).map((v, i) => (
                                                    <div key={i}>Parcela {i + 1}: R$ {v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            )}
                        </div>
                    </div>
                )}

                {/* SEÇÃO 4: Gerar Contrato (documentos futuros: apenas botão de contrato) */}
                {orcamentoSelecionado && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-amber-900/40 flex items-center justify-center text-yellow-600 dark:text-amber-300" aria-hidden>
                                🧾
                            </span>
                            Contrato
                        </h3>
                        <div className="bg-amber-50 dark:bg-amber-950/25 border border-yellow-200 dark:border-amber-800 rounded-xl p-6 space-y-3">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Gere o contrato de prestação de serviços com os dados do orçamento e da forma de pagamento. Escolha abaixo qual modelo deseja usar como base, edite o texto no editor e salve ou imprima conforme necessário.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleAbrirGerarContrato('simplificado')}
                                    className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all shadow-medium font-semibold"
                                >
                                    <span className="text-lg leading-none" aria-hidden>
                                        🧾
                                    </span>
                                    Contrato Simplificado
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAbrirGerarContrato('subestacao')}
                                    className="inline-flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-400 dark:border-amber-600 rounded-xl hover:bg-amber-50 dark:hover:bg-slate-700 transition-all font-semibold"
                                >
                                    <span className="text-lg leading-none" aria-hidden>
                                        ⚡
                                    </span>
                                    Contrato Subestação
                                </button>
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
                                Observações do pedido
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                Este texto é salvo no pedido de venda e aparece ao visualizar os detalhes. Você pode reunir negociação, condições de pagamento e demais anotações aqui.
                            </p>
                            <textarea
                                value={vendaForm.observacoes}
                                onChange={(e) => setVendaForm({ ...vendaForm, observacoes: e.target.value })}
                                rows={5}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                placeholder="Ex.: descontos acordados, condições especiais de pagamento, observações comerciais e demais informações do pedido..."
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
                                <DoneAllIcon className="w-5 h-5 shrink-0" />
                                Registrar Venda e Criar Projeto
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );

    const handleFaturarComNFe = (vendaId: string) => {
        try {
            sessionStorage.setItem('nf_faturar_venda_id', vendaId);
            sessionStorage.setItem('nf_faturar_tab', 'nfe');
            onNavigate?.('Emissão NF-e');
        } catch {
            toast.error('Erro ao abrir tela de emissão.');
        }
    };

    const abrirModalEmitirNFe = (venda: any) => {
        setVendaEmitirEscolha(venda);
        setModalEmitirEscolhaOpen(true);
        setEmitirModalStep('escolha');
        setFracoesFaturamento([]);
        setEmpresaFiscalIdFracionado(venda.empresaFiscalId || empresasFiscais[0]?.id || '');
        setBuscaClienteFracionado('');
        setClientesFracionadoLista([]);
    };

    /** Gera recibo da venda em nova janela (impressão / salvar como PDF). Disponível apenas para vendas concluídas. */
    const handleGerarReciboVenda = (venda: any) => {
        const cliente = venda.cliente?.nome || venda.cliente?.razaoSocial || 'Cliente';
        const valor = Number(venda.valorTotal) || 0;
        const valorExtenso = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
        // Mesmo número da lista de vendas (coluna Nº): numeroSequencial → numeroVenda → id
        const numero = (venda as any).numeroSequencial ?? (venda as any).numeroVenda ?? venda.id?.slice(0, 8) ?? '—';
        const titulo = venda.orcamento?.titulo || 'Prestação de serviços';
        const logoUrl = getUploadUrl('/uploads/logos/logo-1762808549243-748106383.png');
        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Recibo - Venda ${numero}</title>
<style>
body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; color: #1e293b; }
h1 { text-align: center; font-size: 22pt; margin-bottom: 16px; }
.pedido-numero { text-align: center; font-size: 16px; font-weight: bold; color: #15803d; margin: 0 0 24px 0; }
.recibo-body { text-align: justify; line-height: 1.6; margin-bottom: 24px; }
.valor { font-size: 18pt; font-weight: bold; text-align: center; margin: 24px 0; }
.data { text-align: right; margin-top: 32px; }
.marca { display: flex; align-items: center; gap: 16px; margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
.marca img { max-height: 80px; max-width: 220px; object-fit: contain; flex-shrink: 0; }
.marca-texto { line-height: 1.35; }
.marca-texto strong { display: block; font-size: 14px; color: #1e293b; margin-bottom: 2px; }
.marca-texto span { font-size: 12px; color: #64748b; }
</style>
</head>
<body>
<h1>RECIBO</h1>
<p class="pedido-numero">Pedido de Venda Nº ${numero}</p>
<p class="recibo-body">Recebemos de <strong>${cliente}</strong> a quantia de <span class="valor">${valorExtenso}</span> referente a: <strong>${titulo}</strong> (Pedido de Venda nº ${numero}).</p>
<p class="data">${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.</p>
<div class="marca">
${logoUrl ? `<img src="${logoUrl}" alt="S3E" onerror="this.style.display='none'" />` : '<span></span>'}
<div class="marca-texto"><strong>S3E ENGENHARIA LTDA.</strong><span>Soluções em Eficiência de Energia Elétrica</span></div>
</div>
</body>
</html>`;
        const w = window.open('', '_blank');
        if (w) {
            w.document.write(html);
            w.document.close();
            w.focus();
            setTimeout(() => { w.print(); }, 300);
        } else {
            toast.error('Permita pop-ups para abrir o recibo.');
        }
    };

    const fecharModalEmitir = () => {
        setModalEmitirEscolhaOpen(false);
        setVendaEmitirEscolha(null);
        setEmitirModalStep('escolha');
        setFracoesFaturamento([]);
    };

    // Debounce busca de clientes para faturamento fracionado
    useEffect(() => {
        if (!modalEmitirEscolhaOpen || emitirModalStep !== 'fracionado') return;
        const termo = buscaClienteFracionado.trim();
        if (termo.length < 2) {
            setClientesFracionadoLista([]);
            return;
        }
        if (buscaClienteFracionadoDebounceRef.current) clearTimeout(buscaClienteFracionadoDebounceRef.current);
        buscaClienteFracionadoDebounceRef.current = setTimeout(async () => {
            setLoadingClientesFracionado(true);
            const res = await clientesService.pesquisar(termo);
            setClientesFracionadoLista(res.success && res.data ? res.data.slice(0, 15) : []);
            setLoadingClientesFracionado(false);
        }, 300);
        return () => {
            if (buscaClienteFracionadoDebounceRef.current) clearTimeout(buscaClienteFracionadoDebounceRef.current);
        };
    }, [buscaClienteFracionado, modalEmitirEscolhaOpen, emitirModalStep]);

    const adicionarPagadorFracionado = (cliente: any) => {
        if (!cliente?.id) return;
        if (fracoesFaturamento.some(f => f.clienteId === cliente.id)) {
            toast.info('Cliente já adicionado');
            return;
        }
        setFracoesFaturamento(prev => [...prev, { clienteId: cliente.id, clienteNome: cliente.nome || '', valor: 0, dataVencimento: '' }]);
        setBuscaClienteFracionado('');
        setClientesFracionadoLista([]);
    };

    const removerPagadorFracionado = (idx: number) => {
        setFracoesFaturamento(prev => prev.filter((_, i) => i !== idx));
    };

    const somaFracoes = fracoesFaturamento.reduce((s, f) => s + f.valor, 0);
    const saldoAFaturar = vendaEmitirEscolha ? (Number(vendaEmitirEscolha.valorTotal) - Number(vendaEmitirEscolha.valorFaturado ?? 0)) : 0;
    const fracionadoValido = fracoesFaturamento.length > 0 && fracoesFaturamento.every(f => f.clienteId && f.valor > 0 && f.dataVencimento) && somaFracoes <= saldoAFaturar && empresaFiscalIdFracionado;

    const enviarFaturamentoFracionado = async () => {
        if (!vendaEmitirEscolha?.id || !fracionadoValido) return;
        setEnviandoFracionado(true);
        try {
            const res = await nfeFiscalService.emitirFracionado({
                vendaId: vendaEmitirEscolha.id,
                empresaId: empresaFiscalIdFracionado,
                ambiente: ambienteFracionado,
                cfop: '5101',
                naturezaOperacao: 'Venda de Mercadoria',
                serie: '1',
                fracoes: fracoesFaturamento.map(f => ({ clienteId: f.clienteId, valor: f.valor, dataVencimento: f.dataVencimento }))
            });
            if (res.success && res.data) {
                toast.success(res.message || `Faturamento fracionado concluído: ${(res.data as any).notas?.length || 0} NF-e(s) emitida(s).`);
                fecharModalEmitir();
                loadData();
            } else {
                toast.error((res as any).error || res.message || 'Erro ao emitir');
            }
        } catch (e) {
            toast.error('Erro ao emitir faturamento fracionado');
        } finally {
            setEnviandoFracionado(false);
        }
    };

    const handleFaturarComNfse = (vendaId: string) => {
        try {
            sessionStorage.setItem('nf_faturar_venda_id', vendaId);
            sessionStorage.setItem('nf_faturar_tab', 'nfse');
            onNavigate?.('Emissão NF-e');
        } catch {
            toast.error('Erro ao abrir tela de emissão.');
        }
    };

    // Status exibido por venda (Faturado tem prioridade; depois derivado das parcelas)
    const getStatusExibicao = (venda: any): string => {
        const statusBackend = (venda.status || '').toString();
        if (statusBackend === 'Faturado') return 'Faturado';
        const contas = venda.contasReceber || [];
        const totalParcelas = contas.length;
        const qtdTotalmentePagas = contas.filter((c: any) => c.status === 'Pago' || c.status === 'Recebido').length;
        const temPagoOuParcial = contas.some((c: any) => c.status === 'Pago' || c.status === 'Recebido' || c.status === 'Recebido Parcial');
        if (totalParcelas > 0) {
            if (qtdTotalmentePagas === totalParcelas) return 'Concluida';
            if (temPagoOuParcial) return 'Pago Parcial';
            return 'Pendente';
        }
        return statusBackend || 'Pendente';
    };

    const filteredVendas = useMemo(() => {
        if (!Array.isArray(vendas)) return [];
        const term = listSearchTerm.trim().toLowerCase();
        return vendas
            .filter((v) => {
                const statusExibicao = getStatusExibicao(v);
                if (listStatusFilter !== 'Todos' && statusExibicao !== listStatusFilter) return false;
                if (!term) return true;
                const cliente = (v.cliente?.nome || '').toLowerCase();
                const titulo = (v.orcamento?.titulo || '').toLowerCase();
                return cliente.includes(term) || titulo.includes(term);
            })
            .sort((a, b) => new Date(b.dataVenda || b.createdAt).getTime() - new Date(a.dataVenda || a.createdAt).getTime());
    }, [vendas, listSearchTerm, listStatusFilter]);

    // Vendas ordenadas por data (mais recente primeiro) — usado pela visão de "Recentes"
    const vendasOrdenadas = useMemo(() => {
        if (!Array.isArray(vendas)) return [];
        return [...vendas].sort((a, b) => new Date(b.dataVenda || b.createdAt).getTime() - new Date(a.dataVenda || a.createdAt).getTime());
    }, [vendas]);

    const renderListaVendas = () => (
        <div className="space-y-6">
            {/* Filtros - mesmo padrão da página de Orçamentos */}
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por cliente ou projeto..."
                                value={listSearchTerm}
                                onChange={(e) => setListSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                    </div>
                    <div>
                        <select
                            value={listStatusFilter}
                            onChange={(e) => setListStatusFilter(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                        >
                            <option value="Todos">Todos os Status</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Faturado">Faturado</option>
                            <option value="Pago Parcial">Pago Parcial</option>
                            <option value="Concluida">Concluida</option>
                            <option value="Cancelada">Cancelada</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Exibindo <span className="font-bold text-gray-900">{filteredVendas.length}</span> de <span className="font-bold text-gray-900">{vendas.length}</span> vendas
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Pendente: {vendas.filter((v) => getStatusExibicao(v) === 'Pendente').length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Pago Parcial: {vendas.filter((v) => getStatusExibicao(v) === 'Pago Parcial').length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Concluida: {vendas.filter((v) => getStatusExibicao(v) === 'Concluida').length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Faturado: {vendas.filter((v) => getStatusExibicao(v) === 'Faturado').length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Cancelada: {vendas.filter((v) => getStatusExibicao(v) === 'Cancelada' || (v as any).status === 'Cancelada').length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabela de Vendas - mesmo design system da listagem de Orçamentos */}
            {filteredVendas.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-16 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <DocumentTextIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma venda encontrada</h3>
                    <p className="text-gray-500 mb-6">
                        {listSearchTerm || listStatusFilter !== 'Todos'
                            ? 'Tente ajustar os filtros de busca'
                            : 'Comece criando uma nova venda a partir de um orçamento aprovado.'}
                    </p>
                    {!listSearchTerm && listStatusFilter === 'Todos' && (
                        <button
                            onClick={() => setActiveTab('nova')}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Nova Venda
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-soft" style={{ overflow: 'visible', position: 'relative' }}>
                    <div className="overflow-x-auto" style={{ overflowY: 'visible' }}>
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase w-16">Nº</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Cliente</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Título</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Valor</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Data</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase min-w-[200px]">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredVendas.map((venda, index) => {
                                    const statusExibicao = getStatusExibicao(venda);
                                    const statusClasse =
                                        statusExibicao === 'Faturado'
                                            ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-200'
                                            : statusExibicao === 'Concluida'
                                                ? 'bg-green-100 text-green-800 ring-1 ring-green-200'
                                                : statusExibicao === 'Pago Parcial'
                                                    ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200'
                                                    : statusExibicao === 'Pendente'
                                                        ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-200'
                                                        : 'bg-red-100 text-red-800 ring-1 ring-red-200';
                                    const st = (venda as any).status || '';
                                    const canFaturar = st !== 'Faturado' && st !== 'Cancelada' && st !== 'Cancelado';

                                    const actions: Array<{ label: string; icon: React.ReactNode; onClick: () => void; variant?: 'default' | 'danger' | 'primary' | 'success'; show?: boolean }> = [];
                                    if (onNavigate && canFaturar) {
                                        actions.push({
                                            label: 'Emitir NF-e',
                                            icon: <DocumentTextIcon className="w-4 h-4" />,
                                            onClick: () => abrirModalEmitirNFe(venda),
                                            variant: 'success',
                                            show: true
                                        });
                                        actions.push({
                                            label: 'NFS-e',
                                            icon: <DocumentTextIcon className="w-4 h-4" />,
                                            onClick: () => handleFaturarComNfse(venda.id),
                                            variant: 'default',
                                            show: true
                                        });
                                    }
                                    actions.push({
                                        label: 'Visualizar',
                                        icon: <EyeIcon className="w-4 h-4" />,
                                        onClick: () => abrirModalVisualizarVendaCompleto(venda),
                                        variant: 'primary',
                                        show: true
                                    });
                                    if (statusExibicao === 'Concluida') {
                                        actions.push({
                                            label: 'Gerar Recibo',
                                            icon: <DocumentTextIcon className="w-4 h-4" />,
                                            onClick: () => handleGerarReciboVenda(venda),
                                            variant: 'default',
                                            show: true
                                        });
                                    }
                                    const canEdit = st !== 'Cancelada' && st !== 'Cancelado';
                                    if (canEdit) {
                                        actions.push({
                                            label: 'Editar',
                                            icon: <PencilIcon className="w-4 h-4" />,
                                            onClick: () => abrirModalEditarVenda(venda.id),
                                            variant: 'default',
                                            show: true
                                        });
                                    }
                                    if (user?.role?.toLowerCase() === 'desenvolvedor') {
                                        actions.push({
                                            label: 'Atualizar valor',
                                            icon: (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            ),
                                            onClick: async () => {
                                                const confirmar = window.confirm(
                                                    'Atualizar o valor deste PV e das parcelas (contas a receber) com o valor final do orçamento? Use quando o desconto não foi aplicado ao gerar o pedido.'
                                                );
                                                if (!confirmar) return;
                                                const res = await vendasService.atualizarValorDoOrcamento(venda.id);
                                                if (res.success && res.data) {
                                                    toast.success(res.data.message || 'Valor atualizado.', {
                                                        description: `Antes: R$ ${(res.data as any).valorAnterior?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} → Agora: R$ ${(res.data as any).valorNovo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. ${(res.data as any).contasAtualizadas ?? 0} parcela(s) atualizada(s).`
                                                    });
                                                    await loadData();
                                                } else {
                                                    toast.error(res.error || 'Erro ao atualizar valor.');
                                                }
                                            },
                                            variant: 'default',
                                            show: true
                                        });
                                    }
                                    if (canDelete(user)) {
                                        actions.push({
                                            label: 'Excluir',
                                            icon: <TrashIcon className="w-4 h-4" />,
                                            onClick: () => {
                                                setVendaToDelete(venda);
                                                setShowDeleteDialog(true);
                                            },
                                            variant: 'danger',
                                            show: true
                                        });
                                    }

                                    return (
                                        <tr key={venda.id} className="hover:bg-gray-50 transition-colors">
                                        <td className={`px-6 py-4 text-center ${getVendaRowLateralBorderClass(statusExibicao)}`}>
                                            <span className="text-sm font-semibold text-gray-600">
                                                {(venda as any).numeroSequencial ?? (filteredVendas.length - index)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">{venda.cliente?.nome || 'N/A'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900">{venda.orcamento?.titulo || 'Projeto'}</p>
                                            <p className="text-xs text-gray-500">#{(venda as any).numeroVenda || venda.id?.slice(0, 8) || '—'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-lg font-bold text-green-600">
                                                R$ {(venda.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-xs text-gray-500">Pago: R$ {(venda.valorPago || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <p className="text-sm text-gray-900">{new Date(venda.dataVenda).toLocaleDateString('pt-BR')}</p>
                                                <p className="text-xs text-gray-500">{venda.formaPagamento}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-lg ${statusClasse}`}>
                                                {statusExibicao === 'Concluida' && '✅ '}
                                                {statusExibicao === 'Faturado' && '📄 '}
                                                {statusExibicao === 'Pago Parcial' && '💳 '}
                                                {statusExibicao === 'Pendente' && '⏳ '}
                                                {statusExibicao === 'Cancelada' && '❌ '}
                                                {statusExibicao}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4" style={{ position: 'relative', overflow: 'visible', zIndex: 'auto' }}>
                                            <div className="flex items-center justify-center" style={{ position: 'relative' }}>
                                                <ActionsDropdown actions={actions} />
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
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
                        <p className="text-sm text-gray-600">
                            Valor único para todo o sistema. Escolha o mês (AAAA-MM) e salve; o painel usa a meta do mês corrente
                            automaticamente.
                        </p>
                        {carregandoMetaVendas && (
                            <p className="text-sm text-blue-700 font-medium">Carregando meta do servidor…</p>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Mês da meta</label>
                            <input
                                type="month"
                                value={mesMetaConfig}
                                onChange={(e) => setMesMetaConfig(e.target.value)}
                                disabled={!podeEditarMetaVendas}
                                className="w-full max-w-xs px-4 py-3 border-2 border-blue-200 rounded-xl font-semibold disabled:opacity-60"
                            />
                        </div>

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
                                    value={valorMetaForm}
                                    onChange={(e) => setValorMetaForm(parseFloat(e.target.value) || 0)}
                                    disabled={!podeEditarMetaVendas}
                                    className="w-full pl-12 pr-4 py-4 text-2xl font-bold border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                                />
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-gray-600">Meta do mês selecionado:</p>
                                    <p className="text-3xl font-bold text-blue-600">
                                        R${' '}
                                        {valorMetaForm.toLocaleString('pt-BR', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">Faturamento (mês corrente na empresa)</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        R${' '}
                                        {estatisticasVendas.faturamentoMes.toLocaleString('pt-BR', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </p>
                                    {mesMetaConfig === yyyymmMesCorrente() && valorMetaForm > 0 ? (
                                        <p className="text-sm font-semibold text-gray-700 mt-1">
                                            {((estatisticasVendas.faturamentoMes / valorMetaForm) * 100).toFixed(1)}% da meta
                                        </p>
                                    ) : (
                                        <p className="text-sm text-gray-500 mt-1">
                                            Comparativo só quando o mês selecionado é o mês corrente
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4">
                                {mesMetaConfig === yyyymmMesCorrente() && valorMetaForm > 0 ? (
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full transition-all ${
                                                estatisticasVendas.faturamentoMes >= valorMetaForm
                                                    ? 'bg-green-500'
                                                    : 'bg-blue-500'
                                            }`}
                                            style={{
                                                width: `${Math.min(
                                                    (estatisticasVendas.faturamentoMes / valorMetaForm) * 100,
                                                    100
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500">
                                        Barra de progresso igual à do dashboard quando o mês da meta é o atual.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setValorMetaForm(100000);
                                    toast.message('Valor do campo definido para R$ 100.000,00', {
                                        description: podeEditarMetaVendas
                                            ? 'Clique em Salvar para gravar no servidor.'
                                            : undefined,
                                    });
                                }}
                                disabled={!podeEditarMetaVendas}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold disabled:opacity-50"
                            >
                                Resetar campo para R$ 100.000
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!podeEditarMetaVendas) {
                                        toast.error('Sem permissão para alterar a meta');
                                        return;
                                    }
                                    setSalvandoMetaVendas(true);
                                    try {
                                        const res = await configuracoesService.salvarMetaVendas({
                                            mes: mesMetaConfig,
                                            valor: valorMetaForm,
                                        });
                                        if (res.success && res.data) {
                                            await recarregarMetaVendas();
                                            toast.success('Meta salva no sistema', {
                                                description: `Mês ${mesMetaConfig}: R$ ${valorMetaForm.toLocaleString('pt-BR', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}`,
                                            });
                                        } else {
                                            toast.error(res.error || res.message || 'Não foi possível salvar a meta');
                                        }
                                    } finally {
                                        setSalvandoMetaVendas(false);
                                    }
                                }}
                                disabled={!podeEditarMetaVendas || salvandoMetaVendas}
                                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 font-semibold disabled:opacity-50"
                            >
                                {salvandoMetaVendas ? 'Salvando…' : '💾 Salvar Configurações'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Informações sobre permissões */}
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                    <div className="flex items-start gap-3">
                        <span className="text-yellow-600 text-xl">⚠️</span>
                        <div>
                            <p className="font-semibold text-yellow-900">Apenas Administradores e Desenvolvedores</p>
                            <p className="text-sm text-yellow-800 mt-1">
                                Somente administradores (ou usuários com flag admin) e desenvolvedores podem gravar metas. Todos os
                                usuários veem a mesma meta por mês.
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
                                A meta é configurada por Administradores ou Desenvolvedores na aba <strong className="dark:text-orange-300">"⚙️ Configurações"</strong> e vale para todo o sistema.
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
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Vendas</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Gerencie suas vendas e faturamento</p>
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
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
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
                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-medium'
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                >
                    📊 Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('nova')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                        activeTab === 'nova'
                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-medium'
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                >
                    ➕ Nova Venda
                </button>
                <button
                    onClick={() => setActiveTab('lista')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                        activeTab === 'lista'
                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-medium'
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                >
                    📋 Lista de Vendas
                </button>
                {(user?.role?.toLowerCase() === 'admin' || 
                  user?.role?.toLowerCase() === 'gerente' || 
                  user?.role?.toLowerCase() === 'desenvolvedor' ||
                  user?.isAdmin === true) && (
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

            {/* Modal de Edição de Venda (parcelas + NCM) */}
            {modalEditarVendaOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-4 border border-gray-200 dark:border-dark-border">
                        <div className="sticky top-0 bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    <PencilIcon className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Editar Venda</h3>
                                    <p className="text-yellow-100 text-sm">Altere datas de parcelas e NCM dos itens (itens não podem ser adicionados/removidos)</p>
                                </div>
                            </div>
                            <button type="button" onClick={fecharModalEditarVenda} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                                <XMarkIcon className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {loadingEditarVenda ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600 dark:text-gray-400">Carregando venda...</p>
                                </div>
                            ) : vendaParaEditar ? (
                                <>
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Parcelas (Contas a Receber)</h4>
                                        <div className="space-y-3">
                                            {(vendaParaEditar.contasReceber || []).map((conta: any, idx: number) => (
                                                <div key={conta.id} className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">Parcela {conta.numeroParcela ?? idx + 1}</span>
                                                    <label className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Vencimento</span>
                                                        <input
                                                            type="date"
                                                            value={conta.dataVencimento ? String(conta.dataVencimento).slice(0, 10) : ''}
                                                            onChange={(e) => setVendaParaEditar((prev: any) => ({
                                                                ...prev,
                                                                contasReceber: prev.contasReceber.map((c: any, i: number) => i === idx ? { ...c, dataVencimento: e.target.value } : c)
                                                            }))}
                                                            className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white"
                                                        />
                                                    </label>
                                                    <label className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Valor (R$)</span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={conta.valorParcela ?? conta.valor ?? ''}
                                                            onChange={(e) => setVendaParaEditar((prev: any) => ({
                                                                ...prev,
                                                                contasReceber: prev.contasReceber.map((c: any, i: number) => i === idx ? { ...c, valorParcela: parseFloat(e.target.value) || 0 } : c)
                                                            }))}
                                                            className="w-28 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white"
                                                        />
                                                    </label>
                                                    {conta.status && <span className={`text-xs px-2 py-1 rounded ${conta.status === 'Pago' || conta.status === 'Recebido' ? 'bg-green-100 text-green-800' : conta.status === 'Recebido Parcial' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'}`}>{conta.status}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Itens do orçamento (NCM editável)</h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-gray-200 dark:border-dark-border">
                                                        <th className="text-left py-2 text-gray-600 dark:text-gray-400">Descrição</th>
                                                        <th className="text-left py-2 text-gray-600 dark:text-gray-400">Qtd</th>
                                                        <th className="text-left py-2 text-gray-600 dark:text-gray-400">Preço un.</th>
                                                        <th className="text-left py-2 text-gray-600 dark:text-gray-400">NCM</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(vendaParaEditar.orcamento?.items || []).map((item: any, idx: number) => (
                                                        <tr key={item.id} className="border-b border-gray-100 dark:border-dark-border">
                                                            <td className="py-2 text-gray-900 dark:text-white">{item.descricao || item.material?.nome || item.cotacao?.nome || '—'}</td>
                                                            <td className="py-2 text-gray-700 dark:text-gray-300">{item.quantidade}</td>
                                                            <td className="py-2 text-gray-700 dark:text-gray-300">R$ {Number(item.precoUnit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                            <td className="py-2">
                                                                <input
                                                                    type="text"
                                                                    value={item.ncm ?? ''}
                                                                    onChange={(e) => setVendaParaEditar((prev: any) => ({
                                                                        ...prev,
                                                                        orcamento: {
                                                                            ...prev.orcamento,
                                                                            items: prev.orcamento.items.map((it: any, i: number) => i === idx ? { ...it, ncm: e.target.value } : it)
                                                                        }
                                                                    }))}
                                                                    placeholder="NCM"
                                                                    className="w-28 px-2 py-1.5 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white text-sm"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button type="button" onClick={fecharModalEditarVenda} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border font-semibold">
                                            Cancelar
                                        </button>
                                        <button type="button" onClick={salvarEdicaoVenda} disabled={savingEditarVenda} className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 font-semibold disabled:opacity-50">
                                            {savingEditarVenda ? 'Salvando...' : 'Salvar alterações'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-500 text-center py-8">Nenhuma venda carregada.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Emitir NF-e: escolha integral ou fracionado + formulário fracionado */}
            {modalEmitirEscolhaOpen && vendaEmitirEscolha && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-dark-border">
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
                            <h3 className="text-xl font-bold text-white">Emitir NF-e</h3>
                            <button type="button" onClick={fecharModalEmitir} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg">
                                <XMarkIcon className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        <div className="p-6">
                            {emitirModalStep === 'escolha' ? (
                                <div className="space-y-4">
                                    <p className="text-gray-600 dark:text-gray-400">Pedido #{vendaEmitirEscolha.numeroVenda || vendaEmitirEscolha.numeroSequencial} — R$ {Number(vendaEmitirEscolha.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    <button
                                        type="button"
                                        onClick={() => { handleFaturarComNFe(vendaEmitirEscolha.id); fecharModalEmitir(); }}
                                        className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold"
                                    >
                                        Emitir NF-e integral (uma NF para o cliente do pedido)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEmitirModalStep('fracionado')}
                                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
                                    >
                                        Faturamento fracionado (dividir para vários clientes)
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Total do pedido: <strong className="text-gray-900 dark:text-white">R$ {Number(vendaEmitirEscolha.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Saldo a faturar: <strong className="text-green-700 dark:text-green-400">R$ {saldoAFaturar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Empresa emissora</label>
                                        <select
                                            value={empresaFiscalIdFracionado}
                                            onChange={(e) => setEmpresaFiscalIdFracionado(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-xl dark:bg-dark-bg dark:text-white"
                                        >
                                            <option value="">Selecione</option>
                                            {empresasFiscais.map(e => (
                                                <option key={e.id} value={e.id}>{e.razaoSocial || e.nomeFantasia}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ambiente</label>
                                        <select
                                            value={ambienteFracionado}
                                            onChange={(e) => setAmbienteFracionado(e.target.value as '1' | '2')}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-xl dark:bg-dark-bg dark:text-white"
                                        >
                                            <option value="2">Homologação</option>
                                            <option value="1">Produção</option>
                                        </select>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Adicionar pagador (buscar cliente)</label>
                                        <input
                                            type="text"
                                            value={buscaClienteFracionado}
                                            onChange={(e) => setBuscaClienteFracionado(e.target.value)}
                                            placeholder="Digite nome ou CNPJ..."
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-xl dark:bg-dark-bg dark:text-white"
                                        />
                                        {loadingClientesFracionado && <p className="text-xs text-gray-500 mt-1">Buscando...</p>}
                                        {clientesFracionadoLista.length > 0 && (
                                            <ul className="mt-1 border border-gray-200 dark:border-dark-border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                                                {clientesFracionadoLista.map(c => (
                                                    <li key={c.id}>
                                                        <button type="button" onClick={() => adicionarPagadorFracionado(c)} className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm">
                                                            {c.nome} {c.cpfCnpj ? `— ${c.cpfCnpj}` : ''}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="mb-4">
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Lista de pagadores</p>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {fracoesFaturamento.map((f, idx) => (
                                                <div key={idx} className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                    <span className="font-medium text-gray-800 dark:text-white truncate flex-1 min-w-0">{f.clienteNome}</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="Valor"
                                                        value={f.valor || ''}
                                                        onChange={(e) => setFracoesFaturamento(prev => prev.map((x, i) => i === idx ? { ...x, valor: parseFloat(e.target.value) || 0 } : x))}
                                                        className="w-24 px-2 py-1 border border-gray-300 dark:border-dark-border rounded dark:bg-dark-bg dark:text-white text-sm"
                                                    />
                                                    <input
                                                        type="date"
                                                        value={f.dataVencimento || ''}
                                                        onChange={(e) => setFracoesFaturamento(prev => prev.map((x, i) => i === idx ? { ...x, dataVencimento: e.target.value } : x))}
                                                        className="w-36 px-2 py-1 border border-gray-300 dark:border-dark-border rounded dark:bg-dark-bg dark:text-white text-sm"
                                                    />
                                                    <button type="button" onClick={() => removerPagadorFracionado(idx)} className="text-red-600 hover:text-red-800 text-sm font-semibold">Remover</button>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Soma das frações: <strong className={somaFracoes > saldoAFaturar ? 'text-red-600' : 'text-gray-900 dark:text-white'}>R$ {somaFracoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
                                        {somaFracoes > saldoAFaturar && <p className="text-xs text-red-600 mt-1">A soma não pode superar o saldo a faturar.</p>}
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => setEmitirModalStep('escolha')} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl font-semibold">Voltar</button>
                                        <button type="button" onClick={enviarFaturamentoFracionado} disabled={!fracionadoValido || enviandoFracionado} className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-semibold">{enviandoFracionado ? 'Emitindo...' : 'Emitir NF-e fracionado'}</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Visualização de Venda */}
            {modalVisualizarVenda && vendaParaVisualizar && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto my-4">
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    <EyeIcon className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Detalhes da Venda</h3>
                                    <p className="text-blue-100 text-sm mt-1">Informações completas da venda</p>
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
                                                {detalhesVenda.vendedorNome || detalhesVenda.orcamento?.orcamentistaNome || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                Número Sequencial da Venda
                                            </h4>
                                            <p className="text-lg text-gray-900 dark:text-white font-semibold">
                                                N{detalhesVenda.numeroSequencial ?? detalhesVenda.numeroVenda ?? '—'}
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
                                                                        R$ {precoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
                                                                        R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                                    Total cliente (orçamento):
                                                </span>
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                    R$ {(detalhesVenda.orcamento?.precoVenda ?? detalhesVenda.valorTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            {detalhesVenda.orcamento?.items && calcularValorVendaDiretaDoOrcamento(detalhesVenda.orcamento) > 0.009 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                                        Venda direta (fora do PV):
                                                    </span>
                                                    <span className="text-lg font-bold text-amber-800 dark:text-amber-300">
                                                        - R$ {calcularValorVendaDiretaDoOrcamento(detalhesVenda.orcamento).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    Custo de Frete:
                                                </span>
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                    R$ {(detalhesVenda.orcamento?.custoFrete || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="pt-3 border-t-2 border-green-300 dark:border-green-700 flex justify-between items-center">
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                    Valor do PV (a receber):
                                                </span>
                                                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                    R$ {detalhesVenda.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                                    R$ {detalhesVenda.valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
                                                </p>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Valor de Entrada</p>
                                                <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                                                    R$ {(detalhesVenda.valorEntrada || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Valor de Venda</p>
                                                <p className="text-base font-bold text-purple-600 dark:text-purple-400">
                                                    R$ {((detalhesVenda.valorTotal || 0) - (detalhesVenda.valorEntrada || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                                    R$ {(((detalhesVenda.valorTotal || 0) - (detalhesVenda.valorEntrada || 0)) / (detalhesVenda.numeroParcelas || detalhesVenda.parcelas || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">Status da Venda</p>
                                                {(() => {
                                                    const stBackend = (detalhesVenda.status || '').toString();
                                                    if (stBackend === 'Faturado') {
                                                        return (
                                                            <span className="inline-block px-3 py-1 rounded-lg text-sm font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                                                📄 Faturado
                                                            </span>
                                                        );
                                                    }
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

                                        {detalhesVenda.contasReceber && detalhesVenda.contasReceber.length > 0 && (
                                            <ParcelasVendaAuditoriaTable
                                                contas={detalhesVenda.contasReceber}
                                                numeroParcelas={detalhesVenda.numeroParcelas}
                                                parcelas={detalhesVenda.parcelas}
                                            />
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
                                        {String(detalhesVenda.observacoes || '').trim() && (
                                            <div className="mt-4 pt-4 border-t border-purple-300 dark:border-purple-700">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">📌 Observações do pedido de venda</p>
                                                <p className="text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-lg p-3 border border-purple-200 dark:border-purple-700 whitespace-pre-wrap">
                                                    {detalhesVenda.observacoes}
                                                </p>
                                            </div>
                                        )}

                                        {/* Gerar / Editar Contrato + Documento do contrato (visualizar/baixar) + Contrato assinado */}
                                        <div className="mt-4 pt-4 border-t border-purple-300 dark:border-purple-700">
                                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                                <DocumentTextIcon className="w-4 h-4" />
                                                Contrato
                                            </p>
                                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-4">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAbrirGerarContratoDaVenda(detalhesVenda)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-medium transition-colors text-sm hover:from-amber-600 hover:to-amber-700"
                                                    >
                                                        <DocumentTextIcon className="w-4 h-4" />
                                                        Gerar / Editar Contrato
                                                    </button>
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">Edite o texto, imprima ou salve no pedido.</span>
                                                </div>
                                                {detalhesVenda.contratoHtml && (
                                                    <div className="pt-3 border-t border-amber-200 dark:border-amber-700">
                                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Documento do contrato (definido)</p>
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowModalVisualizarContratoDetalhes(true)}
                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors text-sm"
                                                            >
                                                                <EyeIcon className="w-4 h-4" />
                                                                Visualizar contrato
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => { handlePrintContratoDetalhes(); toast.success('Use a janela de impressão para salvar como PDF.'); }}
                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors text-sm"
                                                            >
                                                                <DocumentArrowDownIcon className="w-4 h-4" />
                                                                Baixar PDF
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contrato assinado pelo cliente</p>
                                                {detalhesVenda.contratoPdfUrl ? (
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <a
                                                            href={detalhesVenda.contratoPdfUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors text-sm"
                                                        >
                                                            <DocumentArrowDownIcon className="w-4 h-4" />
                                                            Ver / Baixar PDF assinado
                                                        </a>
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">ou substituir:</span>
                                                        <input
                                                            ref={inputContratoRef}
                                                            type="file"
                                                            accept=".pdf,application/pdf"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const f = e.target.files?.[0];
                                                                if (f && detalhesVenda?.id) handleUploadContratoAssinado(detalhesVenda.id, f);
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={uploadContratoLoading}
                                                            onClick={() => inputContratoRef.current?.click()}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors text-sm disabled:opacity-50"
                                                        >
                                                            {uploadContratoLoading ? 'Enviando...' : 'Substituir PDF'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <input
                                                            ref={inputContratoRef}
                                                            type="file"
                                                            accept=".pdf,application/pdf"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const f = e.target.files?.[0];
                                                                if (f && detalhesVenda?.id) handleUploadContratoAssinado(detalhesVenda.id, f);
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={uploadContratoLoading}
                                                            onClick={() => inputContratoRef.current?.click()}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors text-sm disabled:opacity-50"
                                                        >
                                                            <DocumentArrowUpIcon className="w-4 h-4" />
                                                            {uploadContratoLoading ? 'Enviando...' : 'Enviar PDF do contrato assinado'}
                                                        </button>
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Cliente deve assinar o contrato e enviar o PDF.</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

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
                                                            R$ {(venda.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm border border-gray-300 dark:border-gray-600">
                                                            {temErros ? (
                                                                <div className="text-red-600 dark:text-red-400">
                                                                    <p className="font-semibold">❌ Erros</p>
                                                                    <ul className="text-xs mt-1">
                                                                        {venda.errosVenda.map((erro: string, i: number) => (
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

            {/* Modal de Criar Kit na Página de Vendas */}
            <AlertDialogShadcn open={showCriarKitModalVenda} onOpenChange={setShowCriarKitModalVenda}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">📦</span>
                                Criar Kit
                            </div>
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Transforme {itensSelecionadosVenda.size} item(ns) selecionado(s) em um único item Kit.
                            O valor do kit será a soma de todos os itens selecionados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Nome do Kit *
                            </label>
                            <input
                                type="text"
                                value={nomeKitVenda}
                                onChange={(e) => setNomeKitVenda(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Ex: Kit Instalação Completa, Kit Automação Residencial..."
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                NCM (Nomenclatura Comum do Mercosul)
                            </label>
                            <input
                                type="text"
                                value={ncmKitVenda}
                                onChange={(e) => setNcmKitVenda(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Ex: 85389090 (8 dígitos, para NF-e)"
                                maxLength={8}
                            />
                            <p className="text-xs text-gray-500 mt-1">Opcional. Recomendado preencher para emissão de NF-e.</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                            <p className="text-sm text-blue-800 dark:text-blue-300 font-semibold mb-2">
                                Itens que serão agrupados:
                            </p>
                            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 max-h-32 overflow-y-auto">
                                {orcamentoSelecionado && Array.from(itensSelecionadosVenda)
                                    .sort((a, b) => a - b)
                                    .map(index => {
                                        const item = (itensOrcamentoModificados || orcamentoSelecionado.items)[index];
                                        if (!item) return null;
                                        const subtotal = item.subtotal || ((item.material?.valorVenda || item.precoUnit || item.precoUnitario || 0) * (item.quantidade || 1));
                                        return (
                                            <li key={index} className="flex items-center justify-between">
                                                <span>• {item.nome || item.descricao || item.material?.nome || 'Item'}</span>
                                                <span className="font-semibold">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </li>
                                        );
                                    })}
                            </ul>
                            <div className="mt-3 pt-3 border-t border-blue-300 dark:border-blue-700 flex justify-between items-center">
                                <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">Valor Total do Kit:</span>
                                <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                    R$ {orcamentoSelecionado && Array.from(itensSelecionadosVenda)
                                        .map(index => {
                                            const item = (itensOrcamentoModificados || orcamentoSelecionado.items)[index];
                                            if (!item) return 0;
                                            return item.subtotal || ((item.material?.valorVenda || item.precoUnit || item.precoUnitario || 0) * (item.quantidade || 1));
                                        })
                                        .reduce((sum, val) => sum + val, 0)
                                        .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setNomeKitVenda('');
                            setNcmKitVenda('');
                            setShowCriarKitModalVenda(false);
                        }}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCriarKitVenda}
                            disabled={!nomeKitVenda.trim()}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Criar Kit
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialogShadcn>

            {/* Modal Ver itens do kit unificado (botão olho na lista de itens) */}
            {showModalItensKitVenda && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModalItensKitVenda(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-teal-50 to-blue-50 dark:from-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Itens do Kit</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{nomeKitParaVisualizarVenda}</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setShowModalItensKitVenda(false)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                                    <thead className="bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Nome</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Código</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Quantidade</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Valor de Venda</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                        {itensKitParaVisualizarVenda.map((it: any, idx: number) => {
                                            const qtd = it.quantidade ?? 1;
                                            const valorVenda = it.valorVenda ?? it.precoUnit ?? 0;
                                            const subtotal = it.subtotal ?? (valorVenda * qtd);
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{it.nome || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{it.codigo || '-'}</td>
                                                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">{qtd} {it.unidadeMedida || 'un'}</td>
                                                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">R$ {valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="px-4 py-3 text-right text-sm font-bold text-green-700 dark:text-green-400">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-600 pt-4">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Valor de venda total do kit:</span>
                                <span className="text-lg font-bold text-green-700 dark:text-green-400">
                                    R$ {itensKitParaVisualizarVenda.reduce((s, it) => s + (it.subtotal ?? (it.valorVenda ?? it.precoUnit ?? 0) * (it.quantidade ?? 1)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            {(orcamentoSelecionado?.descontoValor ?? 0) > 0 && (
                                <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                                    O valor total do pedido é o valor final do orçamento (com desconto de R$ {(orcamentoSelecionado?.descontoValor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} aplicado), e não a soma dos itens.
                                </p>
                            )}
                        </div>
                        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                            <button type="button" onClick={() => setShowModalItensKitVenda(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-xl font-medium text-gray-800 dark:text-gray-200">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Visualizar Contrato (documento salvo na venda) - acessível a partir de Detalhes da Venda */}
            {showModalVisualizarContratoDetalhes && detalhesVenda?.contratoHtml && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
                        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Documento do contrato</h3>
                            <button
                                type="button"
                                onClick={() => setShowModalVisualizarContratoDetalhes(false)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                                aria-label="Fechar"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div ref={printContratoDetalhesRef} className="contrato-print-container">
                                <div
                                    className="contrato-documento pdf-page bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg min-h-[400px] w-full max-w-[210mm] mx-auto"
                                    style={{ position: 'relative', width: '210mm', minHeight: '297mm', height: 'auto', overflow: 'visible', fontFamily: 'Arial, Inter, sans-serif', fontSize: '10pt', textAlign: 'justify', lineHeight: 1.5, boxSizing: 'border-box' }}
                                >
                                    <div
                                        className="page-content contrato-documento"
                                        style={{ position: 'relative', zIndex: 1, paddingTop: '95px', paddingLeft: '60px', paddingRight: '60px', paddingBottom: '100px', boxSizing: 'border-box', minHeight: '297mm' }}
                                    >
                                        <div className="page" style={{ margin: 0, padding: 0 }}>
                                            <div className="contrato-html-content" dangerouslySetInnerHTML={{ __html: detalhesVenda.contratoHtml }} />
                                            {renderAssinaturaContratoModelo(resolveContratoValuesFromVendaLike(detalhesVenda))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowModalVisualizarContratoDetalhes(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-xl font-medium"
                            >
                                Fechar
                            </button>
                            <button
                                type="button"
                                onClick={() => { handlePrintContratoDetalhes(); toast.success('Use a janela de impressão para salvar como PDF.'); }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium"
                            >
                                <PrinterIcon className="w-5 h-5" />
                                Imprimir / Baixar PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Div oculto para impressão do contrato a partir dos detalhes (Baixar PDF sem abrir modal) */}
            {detalhesVenda?.contratoHtml && !showModalVisualizarContratoDetalhes && (
                <div ref={printContratoDetalhesRef} className="contrato-print-container absolute -left-[9999px] top-0">
                    <div
                        className="contrato-documento pdf-page w-[210mm] bg-white text-gray-900"
                        style={{ position: 'relative', width: '210mm', minHeight: '297mm', height: 'auto', overflow: 'visible', fontFamily: 'Arial, Inter, sans-serif', fontSize: '10pt', textAlign: 'justify', lineHeight: 1.5, boxSizing: 'border-box' }}
                    >
                        <div
                            className="page-content contrato-documento"
                            style={{ position: 'relative', zIndex: 1, paddingTop: '95px', paddingLeft: '60px', paddingRight: '60px', paddingBottom: '100px', boxSizing: 'border-box', minHeight: '297mm' }}
                        >
                            <div className="page" style={{ margin: 0, padding: 0 }}>
                                <div className="contrato-html-content" dangerouslySetInnerHTML={{ __html: detalhesVenda.contratoHtml }} />
                                {renderAssinaturaContratoModelo(resolveContratoValuesFromVendaLike(detalhesVenda))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Gerar Contrato – abas Design + Pré-visualização (estilo PDFCustomization), grid Editor + Tags Rápidas */}
            {modalContratoOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
                    <div
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] min-h-[80vh] flex flex-col my-4 border border-gray-200 dark:border-gray-700"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header com abas Design | Pré-visualização */}
                        <div className="sticky top-0 flex-shrink-0 bg-[#0a1a2f] px-6 py-4 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl z-10">
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                        <span className="text-2xl" aria-hidden>
                                            {tipoContratoModal === 'subestacao' ? '⚡' : '🧾'}
                                        </span>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Gerar Contrato</h2>
                                        <p className="text-white/80 text-sm">Edite o texto. Use as tags rápidas ou as variáveis já preenchidas.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-2">
                                    {[
                                        { id: 'design' as const, label: 'Design' },
                                        { id: 'preview' as const, label: 'Pré-visualização' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setActiveTabContrato(tab.id);
                                                if (tab.id === 'preview') {
                                                    setTimeout(() => {
                                                        const scrollEl = previewContratoScrollRef.current?.querySelector?.('[class*="overflow-auto"]');
                                                        if (scrollEl && 'scrollTo' in scrollEl) (scrollEl as HTMLElement).scrollTo({ top: 0 });
                                                    }, 50);
                                                }
                                            }}
                                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                                activeTabContrato === tab.id
                                                    ? 'bg-white text-[#0a1a2f]'
                                                    : 'bg-white/20 text-white hover:bg-white/30'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalContratoOpen(false)}
                                className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors text-white"
                                aria-label="Fechar"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Conteúdo: aba Design = grid 75% editor (mesmo padrão do orçamento) + 25% Tags Rápidas; aba Pré-visualização = mesmo layout do Personalizar PDF (orçamento) */}
                        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                            {activeTabContrato === 'design' && (
                                <div className="flex-1 overflow-y-auto p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                    {/* Lado esquerdo (75%): editor contrato (mesmo padrão do orçamento: área centralizada, scroll interno) */}
                                    <div className="lg:col-span-3">
                                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm p-4">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Conteúdo do contrato (editável)</label>
                                            {modalContratoOpen && (
                                                <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] text-gray-500">Carregando editor...</div>}>
                                                    <TechnicalEditor
                                                        value={typeof conteudoContrato === 'string' ? conteudoContrato : ''}
                                                        onChange={setConteudoContrato}
                                                        placeholder="Conteúdo do contrato..."
                                                        height={1000}
                                                        showPagePreview={false}
                                                        externalInsertText={contratoInsertText}
                                                        externalInsertToken={contratoInsertToken}
                                                    />
                                                </Suspense>
                                            )}
                                        </div>
                                    </div>
                                    {/* Lado direito (25%): Tags Rápidas + Folha timbrada */}
                                    <div className="lg:col-span-1 space-y-4">
                                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm p-4 sticky top-4">
                                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Tags Rápidas</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Clique para inserir o valor na posição do cursor no editor.</p>
                                            <div className="flex flex-col gap-2">
                                                {[
                                                    { key: 'empresa', label: 'Empresa (S3E)', value: contratoResolvedValues.empresa },
                                                    { key: 'cnpjS3E', label: 'CNPJ (S3E)', value: contratoResolvedValues.cnpjS3E },
                                                    { key: 'numeroOrcamento', label: 'Nº Orçamento', value: contratoResolvedValues.numeroOrcamento },
                                                    { key: 'dataGeracao', label: 'Data (geração)', value: contratoResolvedValues.dataGeracao },
                                                    { key: 'cliente', label: 'Cliente', value: contratoResolvedValues.cliente },
                                                    { key: 'valorTotal', label: 'Valor Total', value: contratoResolvedValues.valorTotal },
                                                    { key: 'detalheParcelas', label: 'Data/Parcelas', value: contratoResolvedValues.detalheParcelas },
                                                    { key: 'formaPagamento', label: 'Forma Pagamento', value: contratoResolvedValues.formaPagamento }
                                                ].map(({ key, label, value }) => (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => {
                                                            // Inserir no cursor atual (o editor captura a última posição do cursor)
                                                            setContratoInsertText(String(value ?? ''));
                                                            setContratoInsertToken(t => t + 1);
                                                        }}
                                                        className="text-left px-3 py-2 text-sm rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors truncate"
                                                        title={value}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Folha timbrada */}
                                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm p-4">
                                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Folha timbrada</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Use como fundo no PDF. Escolha um arquivo ou selecione da lista.</p>
                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/jpg"
                                                disabled={uploadingFolhaContrato}
                                                className="hidden"
                                                id="contrato-folha-upload"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    setUploadingFolhaContrato(true);
                                                    try {
                                                        const res = await pdfCustomizationService.uploadFolhaTimbrada(file);
                                                        if (res.success && res.data?.url) {
                                                            setFolhaTimbradaContratoUrl(getUploadUrl(res.data.url));
                                                            const list = await pdfCustomizationService.listFolhasTimbradas();
                                                            if (list.success && list.data) setFolhasTimbradasContrato(Array.isArray(list.data) ? list.data : []);
                                                            toast.success('Folha timbrada importada.');
                                                        } else toast.error(res.error || 'Erro ao importar.');
                                                    } catch (err) {
                                                        toast.error('Erro ao importar folha timbrada.');
                                                    } finally {
                                                        setUploadingFolhaContrato(false);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                            <label htmlFor="contrato-folha-upload" className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-600 text-amber-900 dark:text-amber-200 cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/60 mb-3 w-full justify-center">
                                                {uploadingFolhaContrato ? 'Enviando...' : 'Escolher arquivo'}
                                            </label>
                                            {loadingFolhasContrato ? (
                                                <p className="text-xs text-gray-500">Carregando...</p>
                                            ) : folhasTimbradasContrato.length > 0 ? (
                                                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                                                    {folhasTimbradasContrato.map((f) => {
                                                        const url = getUploadUrl(f.url);
                                                        const selected = folhaTimbradaContratoUrl === url || folhaTimbradaContratoUrl?.includes(f.filename);
                                                        return (
                                                            <button
                                                                key={f.filename}
                                                                type="button"
                                                                onClick={() => { setFolhaTimbradaContratoUrl(url); toast.success('Folha selecionada.'); }}
                                                                className={`rounded border-2 p-1 ${selected ? 'border-amber-500 ring-2 ring-amber-300' : 'border-gray-200 dark:border-gray-600'}`}
                                                            >
                                                                <img src={url} alt={f.filename} className="w-full h-12 object-contain" />
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}
                                            {folhaTimbradaContratoUrl && (
                                                <button type="button" onClick={() => setFolhaTimbradaContratoUrl(null)} className="mt-2 text-xs text-red-600 dark:text-red-400">Remover folha</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                </div>
                            )}

                            {activeTabContrato === 'preview' && (
                                <div className="flex-1 flex overflow-hidden min-h-0">
                                    {/* Coluna esquerda: barra estreita com controles (prioridade para o preview do PDF) */}
                                    <div className="w-56 max-w-[220px] p-4 overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                                        <h3 className="text-base font-bold text-gray-900 dark:text-dark-text mb-2">👁️ Pré-visualização</h3>
                                        <p className="text-xs text-gray-600 dark:text-dark-text-secondary mb-3">
                                            Ajuste na aba Design e use os botões abaixo.
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                            Preview para impressão / PDF{folhaTimbradaContratoUrl ? ' (com folha timbrada)' : ''}.
                                        </p>
                                        <div className="space-y-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => { setRefreshPreviewContrato(r => r + 1); toast.success('Preview atualizado.'); }}
                                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                            >
                                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Atualizar Preview
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const vendaParaTemplate = detalhesVenda && contratoVendaId && detalhesVenda.id === contratoVendaId ? detalhesVenda : (vendaParaVisualizar || null);
                                                    if (vendaParaTemplate) {
                                                        setConteudoContrato(getContratoComReplacesFromVenda(vendaParaTemplate));
                                                        toast.success('Restaurado para o padrão do template.');
                                                    } else {
                                                        toast.info('Abra o contrato a partir dos detalhes da venda para restaurar o padrão.');
                                                    }
                                                }}
                                                className="w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg font-medium transition-colors"
                                            >
                                                Restaurar Padrão
                                            </button>
                                        </div>
                                    </div>
                                    {/* Coluna direita: visualizador com toolbar e zoom (igual ao PDFViewer do orçamento); múltiplas páginas A4 como OrcamentoPrintable */}
                                    <div ref={previewContratoScrollRef} className="flex-1 overflow-hidden min-w-0">
                                        <ContractPDFViewer totalPaginas={paginasContrato.length}>
                                            <div ref={printContratoRef} className="contrato-print-container print-container" data-total-pages={paginasContrato.length} key={`contrato-preview-${refreshPreviewContrato}`}>
                                                {paginasContrato.map((chunk, index) => (
                                                    <div
                                                        key={`contrato-page-${index}`}
                                                        className={`contrato-documento pdf-page print:shadow-none mx-auto shadow-lg rounded-lg ${!folhaTimbradaContratoUrl ? 'bg-white' : ''} text-gray-900`}
                                                        style={{
                                                            position: 'relative',
                                                            width: '210mm',
                                                            height: '297mm',
                                                            minHeight: '297mm',
                                                            overflow: 'hidden',
                                                            fontFamily: 'Arial, Inter, sans-serif',
                                                            fontSize: '10pt',
                                                            textAlign: 'justify',
                                                            lineHeight: 1.5,
                                                            boxSizing: 'border-box',
                                                            marginBottom: index < paginasContrato.length - 1 ? '20px' : 0
                                                        }}
                                                    >
                                                        {folhaTimbradaContratoUrl ? (
                                                            <div className="watermark-background custom-letterhead pointer-events-none" style={{ backgroundImage: `url('${folhaTimbradaContratoUrl}')` }} aria-hidden />
                                                        ) : null}
                                                        <div
                                                            className="page-content contrato-documento"
                                                            style={{
                                                                position: 'relative',
                                                                zIndex: 1,
                                                                paddingTop: '95px',
                                                                paddingLeft: '60px',
                                                                paddingRight: '60px',
                                                                paddingBottom: '100px',
                                                                boxSizing: 'border-box',
                                                                height: '297mm',
                                                                minHeight: '297mm',
                                                                overflow: 'hidden',
                                                                display: 'flex',
                                                                flexDirection: 'column'
                                                            }}
                                                        >
                                                            <div className="page" style={{ margin: 0, padding: 0, flex: 1, overflow: 'hidden', maxWidth: '100%' }}>
                                                                <div className="contrato-html-content" style={{ overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '100%' }} dangerouslySetInnerHTML={{ __html: chunk }} />
                                                                {index === paginasContrato.length - 1 && (
                                                                    renderAssinaturaContratoModelo(contratoResolvedValues, tipoContratoModal)
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ContractPDFViewer>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CSS do editor e preview: igual OrcamentoPrintable - altura fixa 297mm por página, page-break na impressão */}
                        <style>{`
                            .contrato-documento { font-family: Arial, Inter, sans-serif !important; font-size: 10pt !important; text-align: justify !important; line-height: 1.5 !important; max-width: 100%; overflow-wrap: break-word; word-break: break-word; }
                            .contrato-documento * { max-width: 100%; box-sizing: border-box; }
                            /* Wrapper por página: garante largura e estilo iguais em TODAS as páginas
                               (o editor pode remover classes dos parágrafos, por isso usamos classes só aqui). */
                            .contrato-html-content { max-width: 165mm; margin: 0 auto; }
                            .contrato-html-content p { margin: 0 0 10pt 0; }
                            .contrato-html-content ul { margin: 0 0 10pt 0; padding-left: 18pt; list-style-type: disc; }
                            .contrato-html-content ol { margin: 0 0 10pt 0; padding-left: 22pt; list-style-type: decimal; }
                            .contrato-html-content li { margin: 0 0 6pt 0; }

                            .contrato-assinatura-modelo { max-width: 165mm; margin: 0 auto; padding-top: 10pt; }
                            .contrato-assinatura-modelo .contrato-data-local { width: 100%; max-width: 165mm; text-align: right; margin: 18pt 0 0 0; }
                            .contrato-assinatura-modelo .contrato-assinaturas { margin-top: 26pt; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 40px; }
                            .contrato-assinatura-modelo .contrato-assinatura-bloco { margin-top: 0; }
                            .contrato-assinatura-modelo .contrato-assinatura-bloco:first-of-type { margin-top: 0; }
                            .contrato-assinatura-modelo .contrato-assinatura-bloco + .contrato-assinatura-bloco { margin-top: 40px; }
                            .contrato-assinatura-modelo .contrato-assinatura-linha { width: 100%; max-width: 480px; min-width: 280px; height: 2px; border-bottom: 2px solid #1e293b; margin: 0 auto 8pt auto; }
                            .contrato-assinatura-modelo--subestacao .contrato-assinatura-linha { margin-bottom: 6pt; }
                            .contrato-assinatura-modelo .contrato-assinatura-nome { font-size: 11pt; font-weight: 600; margin: 0 0 2pt 0; color: #1e293b; }
                            .contrato-assinatura-modelo .contrato-assinatura-rotulo { font-size: 10pt; font-weight: 600; text-transform: uppercase; margin: 0; color: #64748b; }
                            .contrato-assinatura-modelo .contrato-assinatura-ident { font-size: 9.5pt; font-weight: 500; margin: 0 0 2pt 0; color: #111827; text-transform: none; }

                            .jodit-wysiwyg-editor.contrato-documento { font-family: Arial, Inter, sans-serif !important; font-size: 10pt !important; text-align: justify !important; line-height: 1.5 !important; }
                            .contrato-print-container { position: relative; background: transparent; margin: 0 auto; }
                            .contrato-print-container .pdf-page { position: relative; width: 210mm; height: 297mm; min-height: 297mm; background: white; margin: 0 auto 20px auto; box-shadow: 0 4px 12px rgba(0,0,0,0.3); overflow: hidden; box-sizing: border-box; }
                            .dark .contrato-print-container .pdf-page { background: #fff !important; }
                            .dark .contrato-print-container .pdf-page *,
                            .dark .contrato-print-container .contrato-html-content *,
                            .dark .contrato-print-container .contrato-preview-document * { color: #1e293b !important; opacity: 1 !important; }
                            .contrato-print-container .watermark-background { position: absolute; top: 0; left: 0; width: 210mm; height: 297mm; z-index: 0; pointer-events: none; }
                            .contrato-print-container .watermark-background.custom-letterhead { background-size: 210mm 297mm; background-position: top left; background-repeat: no-repeat; }
                            .contrato-print-container .page-content { position: relative; z-index: 1; box-sizing: border-box; height: 297mm; min-height: 297mm; overflow: hidden; display: flex; flex-direction: column; padding-top: 95px; padding-left: 60px; padding-right: 60px; padding-bottom: 100px; }
                            .contrato-print-container .page-content .page { margin: 0; padding: 0; flex: 1; display: flex; flex-direction: column; max-width: 100%; overflow-wrap: break-word; word-break: break-word; overflow: hidden; }
                            .contrato-assinatura, .no-break { page-break-inside: avoid; break-inside: avoid; }
                            @media print {
                                * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                .contrato-print-container .pdf-page { width: 210mm !important; height: 297mm !important; min-height: 297mm !important; box-shadow: none !important; margin: 0 !important; page-break-after: always; break-after: page; overflow: hidden !important; }
                                .contrato-print-container .pdf-page:last-child { page-break-after: auto; break-after: auto; }
                                .contrato-print-container .page-content { padding-top: 95px !important; padding-bottom: 100px !important; padding-left: 60px !important; padding-right: 60px !important; height: 297mm !important; min-height: 297mm !important; overflow: hidden !important; }
                                .contrato-print-container .watermark-background.custom-letterhead { position: fixed !important; width: 210mm; height: 297mm; background-size: 210mm 297mm !important; background-position: top left !important; background-repeat: no-repeat !important; }
                            }
                        `}</style>

                        {/* Footer: igual ao Personalizar PDF (Cancelar, Imprimir, Salvar Alterações quando venda vinculada) */}
                        <div className="sticky bottom-0 flex-shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-b-2xl">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {contratoVendaId && <span className="text-amber-600 dark:text-amber-400">▲ Alterações não salvas</span>}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalContratoOpen(false)}
                                    className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-xl font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        handlePrintContrato();
                                        toast.success('Use a janela de impressão para salvar como PDF.');
                                    }}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                                >
                                    <PrinterIcon className="w-5 h-5" />
                                    Imprimir
                                </button>
                                {contratoVendaId ? (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            const res = await vendasService.saveContratoHtml(contratoVendaId, typeof conteudoContrato === 'string' ? conteudoContrato : '');
                                            if (res.success) {
                                                toast.success(res.message || 'Contrato salvo no pedido de venda.');
                                                if (detalhesVenda?.id === contratoVendaId) {
                                                    setDetalhesVenda((prev: any) => prev ? { ...prev, contratoHtml: conteudoContrato } : null);
                                                }
                                            } else {
                                                toast.error(res.error || 'Erro ao salvar contrato.');
                                            }
                                        } catch (e) {
                                            toast.error('Erro ao salvar contrato.');
                                        }
                                    }}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors"
                                >
                                    Salvar no PV
                                </button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS global para impressão do contrato (igual OrcamentoPrintable) - sempre no DOM para impressão a partir de Detalhes da Venda */}
            <style>{`
                .contrato-documento { font-family: Arial, Inter, sans-serif !important; font-size: 10pt !important; text-align: justify !important; line-height: 1.5 !important; max-width: 100%; overflow-wrap: break-word; word-break: break-word; }
                .contrato-documento * { max-width: 100%; box-sizing: border-box; }
                .contrato-documento p { margin-top: 0.75em; margin-bottom: 0; }
                .contrato-documento p strong { margin-top: 1em; }
                .contrato-print-container { position: relative; background: transparent; margin: 0 auto; }
                .contrato-print-container .pdf-page { position: relative; width: 210mm; height: 297mm; min-height: 297mm; background: white; margin: 0 auto 20px auto; box-shadow: 0 4px 12px rgba(0,0,0,0.3); overflow: hidden; box-sizing: border-box; }
                .contrato-print-container .watermark-background { position: absolute; top: 0; left: 0; width: 210mm; height: 297mm; z-index: 0; pointer-events: none; }
                .contrato-print-container .watermark-background.custom-letterhead { background-size: 210mm 297mm; background-position: top left; background-repeat: no-repeat; }
                .contrato-print-container .page-content { position: relative; z-index: 1; box-sizing: border-box; height: 297mm; min-height: 297mm; overflow: hidden; display: flex; flex-direction: column; padding-top: 95px; padding-left: 60px; padding-right: 60px; padding-bottom: 100px; }
                .contrato-print-container .page-content .page { margin: 0; padding: 0; flex: 1; display: flex; flex-direction: column; max-width: 100%; overflow-wrap: break-word; word-break: break-word; overflow: hidden; }
                .contrato-assinatura, .no-break { page-break-inside: avoid; break-inside: avoid; }
                @media print {
                    .contrato-print-container .pdf-page { width: 210mm !important; height: 297mm !important; min-height: 297mm !important; box-shadow: none !important; margin: 0 !important; page-break-after: always; break-after: page; overflow: hidden !important; }
                    .contrato-print-container .pdf-page:last-child { page-break-after: auto; break-after: auto; }
                    .contrato-print-container .page-content { padding-top: 95px !important; padding-bottom: 100px !important; padding-left: 60px !important; padding-right: 60px !important; height: 297mm !important; min-height: 297mm !important; overflow: hidden !important; }
                    .contrato-print-container .watermark-background.custom-letterhead { position: fixed !important; width: 210mm; height: 297mm; background-size: 210mm 297mm !important; background-position: top left !important; background-repeat: no-repeat !important; }
                }
            `}</style>

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