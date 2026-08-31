import React, { useState, useMemo, useRef, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { type PurchaseOrder, type Supplier, PurchaseStatus, type PurchaseOrderItem, type Product, CatalogItemType } from '../types';
import { parseNFeXML, readFileAsText } from '../utils/xmlParser';
import { comprasService } from '../services/comprasService';
import { obrasService, type Obra } from '../services/obrasService';
import { projetosService } from '../services/projetosService';
import { formatDateBR, parseLocalDate } from '../utils/dateUtils';
import ViewToggle from './ui/ViewToggle';
import { loadViewMode, saveViewMode } from '../utils/viewModeStorage';
import { AuthContext } from '../contexts/AuthContext';
import EditarFracionamentoModal from './EditarFracionamentoModal';
import MaterialDetailsModal, { type MaterialDetailsItem } from './modals/MaterialDetailsModal';
import { canDelete } from '../utils/permissions';
import AlertDialog from './ui/AlertDialog';
import ScrollableRow from './ui/ScrollableRow';
import { scrollableNavItemClasses } from '../utils/responsiveNav';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { axiosApiService } from '../services/axiosApi';
import { empresaFiscalService } from '../services/empresaFiscalService';
import { financeiroService } from '../services/financeiroService';
import { fornecedoresService, type Fornecedor } from '../services/fornecedoresService';
import { formatCNPJ, formatTelefoneBR, onlyDigits } from '../utils/inputMasks';
import {
    itemParaDraft,
    aplicarDraftNoItem,
    atualizarCampoNumericoItem,
    type CompraItemEditDraft
} from '../utils/compraItemList.util';
import {
    classificacaoVaiParaEstoque,
    itemPrecisaVinculoEstoque,
    rotuloVinculoItem,
    classesTomVinculo,
} from '../utils/compraMaterialMatch';

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
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.038-2.124H9.038c-1.128 0-2.038.944-2.038 2.124v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);
const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);
const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);
const DocumentArrowUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);

// XML Import data structure
interface ParsedXMLData {
    invoice: { number: string; emissionDate: string };
    vendor: { name: string; cnpj: string; address: string };
    items: PurchaseOrderItem[];
    payment: { method: string; installments: { dueDate: string; value: string }[] };
}

const getStatusClass = (status: PurchaseStatus) => {
    switch (status) {
        case PurchaseStatus.Recebido: return 'bg-green-100 text-green-800 ring-1 ring-green-200';
        case PurchaseStatus.Pendente: return 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200';
        case PurchaseStatus.Cancelado: return 'bg-red-100 text-red-800 ring-1 ring-red-200';
        default: return 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
    }
};

/** Despesas variadas não têm remessa física — ocultar fluxo "Receber remessa". */
const isCompraDespesasVariadas = (p: PurchaseOrder | null | undefined) =>
    p?.classificacao === 'DESPESAS_VARIADAS';

/** Situação financeira da compra já recebida (para badge lateral). */
type FinanceiroCompraVisual = 'faturado' | 'pago_parcial' | 'recebido';

function getFinanceiroCompraVisual(p: PurchaseOrder): FinanceiroCompraVisual | null {
    if (p.status !== PurchaseStatus.Recebido) return null;
    const contas = p.contasPagar;
    if (!contas || contas.length === 0) return 'recebido';
    const ativas = contas.filter((c) => c.status !== 'Cancelado');
    if (ativas.length === 0) return 'recebido';
    const pagas = ativas.filter((c) => c.status === 'Pago').length;
    if (pagas === ativas.length) return 'faturado';
    if (pagas > 0) return 'pago_parcial';
    return 'recebido';
}

/** Barra lateral + rótulo: azul faturado, laranja recebido, amarelo pago parcial. */
function getCompraBadgeLateral(p: PurchaseOrder): { barClass: string; tag: string | null; tagClass: string } {
    if (p.status === PurchaseStatus.Cancelado) {
        return { barClass: 'bg-red-400', tag: null, tagClass: '' };
    }
    if (p.status === PurchaseStatus.Pendente) {
        return { barClass: 'bg-slate-300', tag: null, tagClass: '' };
    }
    if (p.status === PurchaseStatus.Recebido) {
        const fin = getFinanceiroCompraVisual(p);
        if (fin === 'faturado') {
            return { barClass: 'bg-blue-600', tag: 'FATURADO', tagClass: 'text-blue-700' };
        }
        if (fin === 'pago_parcial') {
            return { barClass: 'bg-yellow-400', tag: 'PAGO PARCIAL', tagClass: 'text-yellow-800' };
        }
        return { barClass: 'bg-orange-500', tag: 'RECEBIDO', tagClass: 'text-orange-700' };
    }
    return { barClass: 'bg-slate-300', tag: null, tagClass: '' };
}

/** Borda esquerda da linha (use no primeiro <td> — em tabelas collapse, border em <tr> costuma não pintar). */
function getCompraRowBorderClass(p: PurchaseOrder): string {
    if (p.status === PurchaseStatus.Cancelado) return 'border-l-4 border-red-400';
    if (p.status === PurchaseStatus.Pendente) return 'border-l-4 border-slate-300';
    if (p.status === PurchaseStatus.Recebido) {
        const fin = getFinanceiroCompraVisual(p);
        if (fin === 'faturado') return 'border-l-4 border-blue-600';
        if (fin === 'pago_parcial') return 'border-l-4 border-yellow-400';
        return 'border-l-4 border-orange-500';
    }
    return 'border-l-4 border-slate-300';
}

/** Parcelas do modal: duplicatas da API, contas a pagar ou xmlData. */
function normalizeParcelasFromPurchase(purchase: any): Array<{ numero: string; dataVencimento: string; valor: number }> {
    const mapDup = (d: any, i: number) => {
        const dv = d?.dataVencimento;
        const dataStr = dv
            ? typeof dv === 'string'
                ? dv.split('T')[0]
                : new Date(dv).toISOString().slice(0, 10)
            : '';
        return {
            numero: String(d?.numero ?? String(i + 1).padStart(3, '0')),
            dataVencimento: dataStr,
            valor: Number(d?.valor) || 0
        };
    };

    if (purchase?.duplicatas && Array.isArray(purchase.duplicatas) && purchase.duplicatas.length > 0) {
        return purchase.duplicatas.map(mapDup);
    }

    if (purchase?.contasPagar && Array.isArray(purchase.contasPagar) && purchase.contasPagar.length > 0) {
        return purchase.contasPagar.map((cp: any, index: number) => {
            const rawValor = cp.valorParcela ?? cp.valor ?? 0;
            const dv = cp.dataVencimento;
            const dataStr = dv
                ? typeof dv === 'string'
                    ? dv.split('T')[0]
                    : new Date(dv).toISOString().slice(0, 10)
                : '';
            const num =
                cp.numeroParcela != null
                    ? String(cp.numeroParcela).padStart(3, '0')
                    : String(index + 1).padStart(3, '0');
            return { numero: num, dataVencimento: dataStr, valor: Number(rawValor) || 0 };
        });
    }

    if (purchase?.xmlData && typeof purchase.xmlData === 'string') {
        try {
            const meta = JSON.parse(purchase.xmlData);
            const dups = meta?.duplicatas;
            if (Array.isArray(dups) && dups.length > 0) {
                return dups.map(mapDup);
            }
        } catch {
            /* ignore */
        }
    }

    return [];
}

interface ComprasProps {
    toggleSidebar: () => void;
}

const Compras: React.FC<ComprasProps> = ({ toggleSidebar }) => {
    const { user } = useContext(AuthContext)!;
    const navigate = useNavigate();
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [filter, setFilter] = useState<PurchaseStatus | 'Todos'>('Todos');
    const [filterEmpresaCNPJ, setFilterEmpresaCNPJ] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(loadViewMode('Compras'));
    
    // Salvar viewMode no localStorage quando mudar
    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        saveViewMode('Compras', mode);
    };
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isXMLModalOpen, setIsXMLModalOpen] = useState(false);
    const [isCompraAvulsa, setIsCompraAvulsa] = useState(false); // ✅ NOVO: Modo compra avulsa
    const [obraId, setObraId] = useState<string>(''); // ✅ NOVO: Obra vinculada
    const [obrasEmAndamento, setObrasEmAndamento] = useState<Obra[]>([]); // ✅ NOVO: Lista de obras em andamento
    type DestinoAvulsaUI = 'ESTOQUE' | 'OBRA' | 'PROJETO';
    const [destinoTipo, setDestinoTipo] = useState<DestinoAvulsaUI>('ESTOQUE');
    const [projetoId, setProjetoId] = useState('');
    const [projetoSearch, setProjetoSearch] = useState('');
    const [projetoLabel, setProjetoLabel] = useState('');
    const [projetoOptions, setProjetoOptions] = useState<
        Array<{ id: string; titulo: string; numeroOs?: string; cliente?: { nome: string } }>
    >([]);
    const [showProjetoDropdown, setShowProjetoDropdown] = useState(false);

    // Action states
    const [purchaseToView, setPurchaseToView] = useState<PurchaseOrder | null>(null);
    const [purchaseToEdit, setPurchaseToEdit] = useState<PurchaseOrder | null>(null);
    const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseOrder | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [purchaseToCancel, setPurchaseToCancel] = useState<PurchaseOrder | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    
    // Estados para recebimento de remessa
    const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false);
    // ✅ CORREÇÃO: Usar data local em vez de UTC para evitar problemas de timezone
    const getDataLocal = () => {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    };
    const [dataRecebimento, setDataRecebimento] = useState(getDataLocal());
    const [itensRecebidos, setItensRecebidos] = useState<{[key: string]: boolean}>({});
    
    // Form state
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [dataEmissaoNF, setDataEmissaoNF] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [serieNF, setSerieNF] = useState<string>('1'); // Série da NF (padrão "1")
    const [status, setStatus] = useState<PurchaseStatus>(PurchaseStatus.Pendente);
    type ExtendedItem = PurchaseOrderItem & { 
        ncm?: string; 
        sku?: string; 
        unidadeMedida?: string;
        materialId?: string; // ID do material do estoque vinculado
        materialVinculado?: any; // Dados completos do material vinculado (para exibição)
        matchAutomatico?: boolean; // Indica se foi feito match automático pelo sistema
        matchTipo?: string | null;
        codigoFornecedor?: string;
        ean?: string;
        criarNovoMaterial?: boolean;
        // Campos de fracionamento
        quantidadeFracionada?: number; // Quantidade de unidades por embalagem
        tipoEmbalagem?: string; // "CAIXA", "PACOTE", etc.
        unidadeEmbalagem?: string; // "cx", "pct", etc.
        /** true = apenas estoque; false = obra/OS conforme classificação */
        destinoEstoque?: boolean;
    };
    const [purchaseItems, setPurchaseItems] = useState<ExtendedItem[]>([]);
    const [productToAdd, setProductToAdd] = useState<{
        name: string;
        quantity: string;
        cost: string;
        ncm?: string;
        sku?: string;
        unidadeMedida?: string;
    }>({ name: '', quantity: '1', cost: '', unidadeMedida: 'un' });
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const [itemEditDraft, setItemEditDraft] = useState<CompraItemEditDraft | null>(null);
    /** Rascunho local enquanto digita qtd/valor unitário (evita travar ao apagar e redigitar) */
    const [inlineNumericDraft, setInlineNumericDraft] = useState<
        Record<number, { quantity: string; unitCost: string }>
    >({});
    
    // Novos campos do fornecedor
    const [supplierName, setSupplierName] = useState('');
    const [supplierCNPJ, setSupplierCNPJ] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [supplierEmail, setSupplierEmail] = useState('');
    const [supplierAddress, setSupplierAddress] = useState('');
    const [fornecedoresCadastrados, setFornecedoresCadastrados] = useState<Fornecedor[]>([]);
    const [showFornecedorDropdown, setShowFornecedorDropdown] = useState(false);
    const fornecedorDropdownRef = useRef<HTMLDivElement>(null);
    /** Data de recebimento da mercadoria (edição) */
    const [dataRecebimentoCompra, setDataRecebimentoCompra] = useState('');

    // XML Import states
    const [selectedXMLFile, setSelectedXMLFile] = useState<File | null>(null);
    const [parsedXMLData, setParsedXMLData] = useState<ParsedXMLData | null>(null);
    const [isProcessingXML, setIsProcessingXML] = useState(false);
    const [xmlError, setXmlError] = useState<string | null>(null);
    const [showXMLImportInsideModal, setShowXMLImportInsideModal] = useState(false);

    // Campos de custos e pagamento
    const [frete, setFrete] = useState<string>('0');
    const [outrasDespesas, setOutrasDespesas] = useState<string>('0');
    const [descontos, setDescontos] = useState<string>('0');
    const [condicaoPagamento, setCondicaoPagamento] = useState<'AVISTA' | 'PARCELADO'>('AVISTA');
    const [meioPagamento, setMeioPagamento] = useState<string>('PIX');
    const [cartaoCreditoId, setCartaoCreditoId] = useState<string>('');
    const [cartoesCredito, setCartoesCredito] = useState<Array<{ id: string; nomeOuBanco: string; ultimosQuatroDigitos: string; bandeira: string }>>([]);
    const [numParcelas, setNumParcelas] = useState<string>('1');
    const [dataPrimeiroVencimento, setDataPrimeiroVencimento] = useState<string>('');

    // Campos fiscais/ERP adicionais
    const [destinatarioCNPJ, setDestinatarioCNPJ] = useState<string>('');
    const [statusImportacao, setStatusImportacao] = useState<'MANUAL' | 'XML'>('MANUAL');
    // ✅ NOVO: Empresa compradora (para identificar qual CNPJ está sendo usado)
    const [empresasFiscais, setEmpresasFiscais] = useState<any[]>([]);
    const [empresaCompradoraId, setEmpresaCompradoraId] = useState<string>('');
    const [empresaCompradoraNome, setEmpresaCompradoraNome] = useState<string>('');
    const [empresaCompradoraCNPJ, setEmpresaCompradoraCNPJ] = useState<string>('');
    const [valorIPI, setValorIPI] = useState<string>('0');
    // Duplicatas/Parcelas
    const [duplicatas, setDuplicatas] = useState<Array<{numero: string, dataVencimento: string, valor: number}>>([]);
    const [parcelas, setParcelas] = useState<Array<{ numero: string; dataVencimento: string; valor: number }>>([]);
    const [observacoesCompra, setObservacoesCompra] = useState('');
    const [observacoesDetalheDraft, setObservacoesDetalheDraft] = useState('');
    const [salvandoObservacoes, setSalvandoObservacoes] = useState(false);

    // Estados para editar fracionamento
    const [fracionamentoModalOpen, setFracionamentoModalOpen] = useState(false);
    const [itemFracionamentoEditando, setItemFracionamentoEditando] = useState<{
        id?: string;
        productName: string;
        quantity: number;
        quantidadeFracionada?: number;
        tipoEmbalagem?: string;
        unidadeEmbalagem?: string;
    } | null>(null);
    
    // Estado para conversão de unidade (ex: km -> m) dos itens
    const [unitConversionModalOpen, setUnitConversionModalOpen] = useState(false);
    const [itemUnidadeEditando, setItemUnidadeEditando] = useState<{
        index: number;
        productName?: string;
        quantity?: number;
        unitCost?: number;
        totalCost?: number;
        unidadeMedida?: string;
    } | null>(null);
    const [targetUnit, setTargetUnit] = useState<'km' | 'm' | 'cm'>('m');
    
    // Estados para busca de material do estoque
    const [materiais, setMateriais] = useState<any[]>([]);
    const [buscaMaterialPorItem, setBuscaMaterialPorItem] = useState<{ [key: number]: string }>({});
    const [materialVisualizando, setMaterialVisualizando] = useState<{ itemIndex: number; material: any } | null>(null);
    const [isMaterialDetailsModalOpen, setIsMaterialDetailsModalOpen] = useState(false);
    const [selectedMaterialItem, setSelectedMaterialItem] = useState<MaterialDetailsItem | null>(null);

    // Carregar materiais do estoque
    useEffect(() => {
        const carregarMateriais = async () => {
            try {
                const resp = await axiosApiService.get<any[]>('/api/materiais');
                if ((resp as any)?.success) {
                    const data = (resp as any)?.data;
                    setMateriais(Array.isArray(data) ? data : []);
                } else {
                    console.error('Erro ao carregar materiais:', resp);
                    setMateriais([]);
                }
            } catch (error) {
                console.error('Erro ao carregar materiais:', error);
                setMateriais([]);
            }
        };
        carregarMateriais();
    }, []);
    
    // Filtrar materiais por item específico
    const getMateriaisFiltradosPorItem = (itemIndex: number) => {
        const busca = buscaMaterialPorItem[itemIndex] || '';
        if (!busca) return [];
        return materiais.filter(m => 
            (m.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
            (m.sku || '').toLowerCase().includes(busca.toLowerCase()) ||
            (m.descricao || '').toLowerCase().includes(busca.toLowerCase())
        ).slice(0, 10);
    };

    // Função para vincular material a um item
    const vincularMaterialAItem = (itemIndex: number, material: any) => {
        setPurchaseItems(prev => prev.map((item, idx) => {
            if (idx === itemIndex) {
                return {
                    ...item,
                    materialId: material.id,
                    materialVinculado: material,
                    matchAutomatico: false,
                    matchTipo: 'MANUAL',
                    criarNovoMaterial: false,
                };
            }
            return item;
        }));
        setBuscaMaterialPorItem(prev => ({ ...prev, [itemIndex]: '' }));
    };

    // Função para remover vinculação de material
    const removerVinculacaoMaterial = (itemIndex: number) => {
        setPurchaseItems(prev => prev.map((item, idx) => {
            if (idx === itemIndex) {
                return {
                    ...item,
                    materialId: undefined,
                    materialVinculado: undefined,
                    matchAutomatico: false,
                    matchTipo: null,
                    criarNovoMaterial: false,
                };
            }
            return item;
        }));
    };

    const marcarItemComoNovo = (itemIndex: number) => {
        setPurchaseItems(prev => prev.map((item, idx) => {
            if (idx === itemIndex) {
                return {
                    ...item,
                    materialId: undefined,
                    materialVinculado: undefined,
                    matchAutomatico: false,
                    matchTipo: null,
                    criarNovoMaterial: true,
                };
            }
            return item;
        }));
        setBuscaMaterialPorItem(prev => {
            const novo = { ...prev };
            delete novo[itemIndex];
            return novo;
        });
    };

    const totalProdutosCalculado = useMemo(() => {
        return purchaseItems.reduce((total, item) => total + (item.totalCost ?? 0), 0);
    }, [purchaseItems]);

    const valorTotalNotaCalculado = useMemo(() => {
        const sub = totalProdutosCalculado;
        const desc = Math.min(parseFloat(descontos || '0') || 0, sub);
        const baseProdutos = Math.max(0, sub - desc);
        const freteNum = parseFloat(frete || '0') || 0;
        const outrasNum = parseFloat(outrasDespesas || '0') || 0;
        const ipiNum = parseFloat(valorIPI || '0') || 0;
        return baseProdutos + ipiNum + freteNum + outrasNum;
    }, [valorIPI, frete, outrasDespesas, descontos, totalProdutosCalculado]);

    // Carregar compras reais
    const loadPurchaseOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            console.log('🔍 Carregando compras...');
            const data = await comprasService.getCompras();
            console.log('✅ Compras carregadas:', data.length, data);
            setPurchaseOrders(data);
        } catch (e) {
            console.error('❌ Erro ao carregar compras:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPurchaseOrders();
    }, [loadPurchaseOrders]);

    useEffect(() => {
        const carregarCartoes = async () => {
            const res = await financeiroService.listarCartoes(true);
            if (res.success && res.data) setCartoesCredito(res.data);
        };
        carregarCartoes();
    }, []);

    // ✅ NOVO: Carregar obras em andamento para compra avulsa
    useEffect(() => {
        const carregarObras = async () => {
            try {
                const response = await obrasService.getObrasKanban();
                if (response.success && response.data) {
                    // Filtrar apenas obras em ANDAMENTO
                    const obrasAndamento = [
                        ...(response.data.ANDAMENTO || []),
                        ...(response.data.A_FAZER || []) // Incluir também obras "A_FAZER" que podem estar prestes a iniciar
                    ];
                    setObrasEmAndamento(obrasAndamento);
                }
            } catch (error) {
                console.error('Erro ao carregar obras:', error);
            }
        };
        carregarObras();
    }, []);

interface ComprasPropsExtended {
    toggleSidebar?: () => void;
    suppressSuspenseSpinner?: boolean;
}

const filteredPurchases = useMemo(() => {
        let filtered = purchaseOrders;
        
        if (filter !== 'Todos') {
            filtered = filtered.filter(purchase => purchase.status === filter);
        }
        
        if (filterEmpresaCNPJ) {
            filtered = filtered.filter(purchase => {
                const cnpjCompra = (purchase as any).empresaCompradoraCNPJ || '';
                const cnpjLimpoCompra = cnpjCompra.replace(/\D/g, '');
                const cnpjLimpoFiltro = filterEmpresaCNPJ.replace(/\D/g, '');
                return cnpjLimpoCompra === cnpjLimpoFiltro;
            });
        }
        
        if (searchTerm) {
            filtered = filtered.filter(purchase => {
                const term = searchTerm.toLowerCase();
                const supplierName = (purchase.supplierName || '').toLowerCase();
                const invoice = (purchase.invoiceNumber || '').toLowerCase();
                const numeroSeq = purchase.numeroSequencial !== undefined && purchase.numeroSequencial !== null ? String(purchase.numeroSequencial) : (purchase.numero ? String(purchase.numero) : '');
                const idLower = (purchase.id || '').toLowerCase();
                return supplierName.includes(term) || invoice.includes(term) || numeroSeq.includes(term) || idLower.includes(term);
            });
        }
        
        return filtered;
    }, [filter, filterEmpresaCNPJ, searchTerm, purchaseOrders]);

    const normalizarParaBusca = useCallback(
        (texto: string) =>
            (texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
        []
    );

    const fornecedoresFiltrados = useMemo(() => {
        const termo = supplierName.trim();
        if (!termo) return fornecedoresCadastrados.slice(0, 10);
        const termoNorm = normalizarParaBusca(termo);
        const termoDigitos = termo.replace(/\D/g, '');
        return fornecedoresCadastrados
            .map((f) => {
                const nomeNorm = normalizarParaBusca(f.nome);
                const cnpjDigits = (f.cnpj || '').replace(/\D/g, '');
                const palavras = nomeNorm.split(/\s+/);
                const nomeComecaCom = nomeNorm.startsWith(termoNorm);
                const algumaPalavraComeca = palavras.some((p) => p.startsWith(termoNorm));
                const nomeContem = nomeNorm.includes(termoNorm);
                const cnpjContem = termoDigitos.length >= 2 && cnpjDigits.includes(termoDigitos);
                if (!nomeComecaCom && !algumaPalavraComeca && !nomeContem && !cnpjContem) return null;
                let score = 0;
                if (nomeComecaCom) score = 100;
                else if (algumaPalavraComeca) score = 80;
                else if (nomeContem) score = 50;
                else if (cnpjContem) score = 30;
                return { fornecedor: f, score };
            })
            .filter((x): x is { fornecedor: Fornecedor; score: number } => x !== null)
            .sort((a, b) => b.score - a.score)
            .map((x) => x.fornecedor)
            .slice(0, 10);
    }, [fornecedoresCadastrados, supplierName, normalizarParaBusca]);

    const handlePhoneChangeEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSupplierPhone(formatTelefoneBR(e.target.value));
    };

    const handleCnpjFornecedorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSupplierCNPJ(formatCNPJ(e.target.value));
    };

    const handleCnpjDestinatarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDestinatarioCNPJ(formatCNPJ(e.target.value));
    };

    const handleCnpjEmpresaCompradoraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmpresaCompradoraCNPJ(formatCNPJ(e.target.value));
    };

    const handleSelecionarFornecedor = (f: Fornecedor) => {
        setSupplierName(f.nome);
        setSupplierCNPJ(f.cnpj ? formatCNPJ(f.cnpj) : '');
        setSupplierPhone(f.telefone ? formatTelefoneBR(f.telefone) : '');
        setSupplierEmail(f.email || '');
        const partes = [f.endereco, f.cidade, f.estado, f.cep].filter(Boolean);
        setSupplierAddress(partes.join(partes.length > 1 ? ', ' : ''));
        setShowFornecedorDropdown(false);
    };

    // Handlers
    const handleOpenModal = (purchase: PurchaseOrder | null = null, compraAvulsa: boolean = false) => {
        if (purchase) {
            setPurchaseToEdit(purchase);
            setSelectedSupplierId(purchase.supplierId || '');
            // Formatar data corretamente
            const dataCompra = purchase.orderDate ? purchase.orderDate.split('T')[0] : new Date().toISOString().split('T')[0];
            setPurchaseDate(dataCompra);
            const emissaoNF = (purchase as any).dataEmissaoNF;
            setDataEmissaoNF(emissaoNF ? (typeof emissaoNF === 'string' ? emissaoNF.slice(0, 10) : new Date(emissaoNF).toISOString().slice(0, 10)) : dataCompra);
            setInvoiceNumber(purchase.invoiceNumber || '');
            setSerieNF((purchase as any).serieNF || '1');
            setStatus(purchase.status);
            setPurchaseItems(purchase.items);
            setSupplierName(purchase.supplierName || '');
            const cnpjRaw = (purchase as any).fornecedorCNPJ || '';
            setSupplierCNPJ(cnpjRaw ? formatCNPJ(String(cnpjRaw)) : '');
            setSupplierPhone((purchase as any).fornecedorTel ? formatTelefoneBR(String((purchase as any).fornecedorTel)) : '');
            setIsCompraAvulsa(false); // Edição não é compra avulsa
            setObraId((purchase as any).obraId || '');
            // Carregar valores financeiros
            setFrete(String((purchase as any).frete || (purchase as any).valorFrete || 0));
            setOutrasDespesas(String((purchase as any).outrasDespesas || 0));
            setDescontos(String((purchase as any).valorDesconto ?? 0));
            setValorIPI(String((purchase as any).valorIPI || 0));
            setCondicaoPagamento((purchase as any).condicoesPagamento === 'PARCELADO' ? 'PARCELADO' : 'AVISTA');
            // Empresa compradora (para edição)
            setEmpresaCompradoraNome((purchase as any).empresaCompradoraNome || '');
            setObservacoesCompra(purchase.notes || purchase.observacoes || '');
            const dr = (purchase as any).dataRecebimento;
            setDataRecebimentoCompra(
                dr
                    ? typeof dr === 'string'
                        ? dr.split('T')[0]
                        : new Date(dr).toISOString().slice(0, 10)
                    : ''
            );
            const parcelasNorm = normalizeParcelasFromPurchase(purchase);
            setDuplicatas(parcelasNorm);
            setParcelas(parcelasNorm);
            setDestinatarioCNPJ((purchase as any).destinatarioCNPJ ? formatCNPJ(String((purchase as any).destinatarioCNPJ)) : '');
            setEmpresaCompradoraCNPJ((purchase as any).empresaCompradoraCNPJ ? formatCNPJ(String((purchase as any).empresaCompradoraCNPJ)) : '');
        } else {
            resetForm();
            setIsCompraAvulsa(compraAvulsa); // ✅ NOVO: Definir modo compra avulsa
        }
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setPurchaseToEdit(null);
        setSelectedSupplierId('');
        setPurchaseDate(new Date().toISOString().split('T')[0]);
        setDataEmissaoNF(new Date().toISOString().split('T')[0]);
        setInvoiceNumber('');
        setSerieNF('1');
        setStatus(PurchaseStatus.Pendente);
        setPurchaseItems([]);
        setSupplierName('');
        setSupplierCNPJ('');
        setSupplierPhone('');
        setSupplierEmail('');
        setSupplierAddress('');
        setIsCompraAvulsa(false); // ✅ NOVO: Resetar modo compra avulsa
        setObraId(''); // ✅ NOVO: Resetar obra selecionada
        setDestinoTipo('ESTOQUE');
        setProjetoId('');
        setProjetoSearch('');
        setProjetoLabel('');
        setProjetoOptions([]);
        setShowProjetoDropdown(false);
        // ✅ NOVO: Resetar empresa compradora
        setEmpresaCompradoraId('');
        setEmpresaCompradoraNome('');
        setEmpresaCompradoraCNPJ('');
        // Resetar campos financeiros
        setFrete('0');
        setOutrasDespesas('0');
        setDescontos('0');
        setValorIPI('0');
        setDestinatarioCNPJ('');
        setCondicaoPagamento('AVISTA');
        setNumParcelas('1');
        setDataPrimeiroVencimento('');
        setDuplicatas([]);
        setParcelas([]);
        setDataRecebimentoCompra('');
        setShowFornecedorDropdown(false);
        setShowXMLImportInsideModal(false);
        setSelectedXMLFile(null);
        setXmlError(null);
        setObservacoesCompra('');
        setEditingItemIndex(null);
        setItemEditDraft(null);
        setInlineNumericDraft({});
        setProductToAdd({ name: '', quantity: '1', cost: '', ncm: '', sku: '', unidadeMedida: 'un' });
    };

    useEffect(() => {
        if (purchaseToView) {
            setObservacoesDetalheDraft(purchaseToView.notes || purchaseToView.observacoes || '');
        }
    }, [purchaseToView]);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('s3e_compra_avulsa_preset');
            if (!raw) return;
            sessionStorage.removeItem('s3e_compra_avulsa_preset');
            const preset = JSON.parse(raw) as {
                destinoTipo?: DestinoAvulsaUI;
                projetoId?: string;
                projetoLabel?: string;
                obraId?: string;
                items?: Array<{
                    productName: string;
                    quantity: number;
                    unitCost?: number;
                    materialId?: string;
                    destinoEstoque?: boolean;
                }>;
            };
            setIsCompraAvulsa(true);
            setDestinoTipo(preset.destinoTipo || 'PROJETO');
            if (preset.projetoId) setProjetoId(preset.projetoId);
            if (preset.projetoLabel) {
                setProjetoLabel(preset.projetoLabel);
                setProjetoSearch(preset.projetoLabel);
            }
            if (preset.obraId) setObraId(preset.obraId);
            if (preset.items?.length) {
                setPurchaseItems(
                    preset.items.map((it) => ({
                        productName: it.productName,
                        quantity: it.quantity,
                        unitCost: it.unitCost ?? 0,
                        totalCost: (it.unitCost ?? 0) * it.quantity,
                        materialId: it.materialId,
                        destinoEstoque: it.destinoEstoque ?? false,
                    })),
                );
            }
            setIsModalOpen(true);
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        if (!isCompraAvulsa || destinoTipo !== 'PROJETO') return;
        const q = projetoSearch.trim();
        if (q.length < 2) {
            setProjetoOptions([]);
            return;
        }
        const t = window.setTimeout(async () => {
            const res = await projetosService.buscarPorTermo(q, 20);
            if (res.success && Array.isArray(res.data)) {
                setProjetoOptions(res.data);
                setShowProjetoDropdown(true);
            }
        }, 300);
        return () => window.clearTimeout(t);
    }, [projetoSearch, isCompraAvulsa, destinoTipo]);

    const temClassificacaoDestino =
        isCompraAvulsa && destinoTipo !== 'ESTOQUE' && (destinoTipo === 'OBRA' ? !!obraId : !!projetoId);

    const marcarTodosItensDestino = (paraDestino: boolean) => {
        setPurchaseItems((prev) =>
            prev.map((it) => ({ ...it, destinoEstoque: paraDestino ? false : true })),
        );
    };

    const salvarObservacoesDetalhe = async () => {
        if (!purchaseToView) return;
        setSalvandoObservacoes(true);
        try {
            await comprasService.updateCompra(purchaseToView.id, { observacoes: observacoesDetalheDraft });
            const refreshed = await comprasService.getCompraById(purchaseToView.id);
            setPurchaseToView(refreshed);
            const data = await comprasService.getCompras();
            setPurchaseOrders(data);
            toast.success('Observações salvas');
        } catch (e) {
            console.error(e);
            toast.error('Não foi possível salvar as observações');
        } finally {
            setSalvandoObservacoes(false);
        }
    };

    const handleOpenReceivingModal = () => {
        // ✅ CORREÇÃO: Sempre usar data atual local ao abrir o modal
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        setDataRecebimento(`${ano}-${mes}-${dia}`);
        // Inicializar todos os itens como recebidos por padrão
        if (purchaseToView) {
            const inicialRecebidos: {[key: string]: boolean} = {};
            purchaseToView.items.forEach((item: any) => {
                // ✅ CRÍTICO: SEMPRE usar item.id (ID do CompraItem do banco)
                if (item.id) {
                    inicialRecebidos[item.id] = true;
                }
            });
            console.log(`✅ Inicializando ${Object.keys(inicialRecebidos).length} itens como marcados`, inicialRecebidos);
            setItensRecebidos(inicialRecebidos);
        }
        setIsReceivingModalOpen(true);
    };

    const handleReceberRemessa = async () => {
        if (!purchaseToView) return;
        
        // Verificar se pelo menos um item foi marcado
        const compraItemIds = Object.keys(itensRecebidos).filter(key => itensRecebidos[key]);
        if (compraItemIds.length === 0) {
            toast.error('❌ Selecione pelo menos um item para receber');
            return;
        }
        
        // ✅ CORREÇÃO: Enviar os IDs dos CompraItem, não os materialIds
        // O backend precisa dos IDs dos itens da compra para processar corretamente,
        // especialmente para itens sem materialId (que serão criados automaticamente)
        console.log('📦 Recebendo remessa:', purchaseToView.id, 'Data:', dataRecebimento);
        console.log('📦 CompraItems selecionados:', compraItemIds);
        
        if (compraItemIds.length === 0) {
            toast.error('❌ Nenhum item selecionado para processar');
            return;
        }
        
        try {
            // Enviar compraItemIds para o backend processar o estoque
            await comprasService.receberRemessaParcial(
                purchaseToView.id, 
                PurchaseStatus.Recebido, 
                dataRecebimento,
                compraItemIds // ✅ Enviando IDs dos CompraItem, não materialIds
            );
            
            // Recarregar lista
            const data = await comprasService.getCompras();
            setPurchaseOrders(data);
            
            // Fechar modais
            setIsReceivingModalOpen(false);
            setPurchaseToView(null);
            
            const todosRecebidos = compraItemIds.length === purchaseToView.items.length;
            if (todosRecebidos) {
                toast.success('✅ Remessa recebida com sucesso! O estoque foi atualizado.');
            } else {
                toast.success(`✅ ${compraItemIds.length} de ${purchaseToView.items.length} itens recebidos! O estoque foi atualizado.`);
            }
        } catch (error) {
            console.error('❌ Erro ao receber remessa:', error);
            toast.error('❌ Erro ao receber remessa');
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    // Carregar empresas fiscais na montagem da página (para filtro) e quando o modal abrir
    useEffect(() => {
        loadEmpresasFiscais();
    }, []);
    useEffect(() => {
        if (isModalOpen) {
            loadEmpresasFiscais();
        }
    }, [isModalOpen]);

    useEffect(() => {
        if (!isModalOpen) return;
        (async () => {
            try {
                const resp = await fornecedoresService.listar({ ativo: true });
                const data = (resp as any)?.data ?? resp;
                setFornecedoresCadastrados(Array.isArray(data) ? data : []);
            } catch {
                setFornecedoresCadastrados([]);
            }
        })();
    }, [isModalOpen]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (fornecedorDropdownRef.current && !fornecedorDropdownRef.current.contains(e.target as Node)) {
                setShowFornecedorDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadEmpresasFiscais = async () => {
        try {
            const response = await empresaFiscalService.listar();
            if (response.data) {
                setEmpresasFiscais(response.data);
            }
        } catch (error) {
            console.error('Erro ao carregar empresas fiscais:', error);
        }
    };

    const handleEmpresaCompradoraChange = (empresaId: string) => {
        setEmpresaCompradoraId(empresaId);
        const empresa = empresasFiscais.find(e => e.id === empresaId);
        if (empresa) {
            setEmpresaCompradoraNome(empresa.razaoSocial || empresa.nomeFantasia || '');
            setEmpresaCompradoraCNPJ(empresa.cnpj ? formatCNPJ(String(empresa.cnpj)) : '');
        } else {
            setEmpresaCompradoraNome('');
            setEmpresaCompradoraCNPJ('');
        }
    };


    // Fechar modais com ESC
    useEscapeKey(isModalOpen, handleCloseModal);
    useEscapeKey(isXMLModalOpen, () => setIsXMLModalOpen(false));
    useEscapeKey(isReceivingModalOpen, () => {
        setIsReceivingModalOpen(false);
        setPurchaseToView(null);
    });
    useEscapeKey(!!purchaseToView, () => setPurchaseToView(null));
    useEscapeKey(!!purchaseToDelete, () => setPurchaseToDelete(null));

    const limparFormularioAdicao = () => {
        setProductToAdd({ name: '', quantity: '1', cost: '', ncm: '', sku: '', unidadeMedida: 'un' });
        setEditingItemIndex(null);
        setItemEditDraft(null);
        setInlineNumericDraft({});
    };

    const getInlineNumericDisplay = (
        index: number,
        field: 'quantity' | 'unitCost',
        item: ExtendedItem
    ): string => {
        if (inlineNumericDraft[index]) {
            return inlineNumericDraft[index][field];
        }
        if (editingItemIndex === index && itemEditDraft) {
            return field === 'quantity' ? itemEditDraft.quantity : itemEditDraft.unitCost;
        }
        const val = field === 'quantity' ? item.quantity : item.unitCost;
        return val === undefined || val === null ? '' : String(val);
    };

    const handleInlineNumericChange = (
        index: number,
        field: 'quantity' | 'unitCost',
        value: string
    ) => {
        const item = purchaseItems[index];
        if (!item) return;

        setInlineNumericDraft((prev) => ({
            ...prev,
            [index]: {
                quantity:
                    field === 'quantity'
                        ? value
                        : prev[index]?.quantity ?? String(item.quantity ?? ''),
                unitCost:
                    field === 'unitCost'
                        ? value
                        : prev[index]?.unitCost ?? String(item.unitCost ?? '')
            }
        }));

        if (itemEditDraft && editingItemIndex === index) {
            setItemEditDraft((prev) =>
                prev
                    ? {
                          ...prev,
                          [field === 'quantity' ? 'quantity' : 'unitCost']: value
                      }
                    : prev
            );
        }

        const updated = atualizarCampoNumericoItem(item, field, value);
        if (updated) {
            setPurchaseItems((prev) => prev.map((it, i) => (i === index ? updated : it)));
        }
    };

    const commitInlineNumericDraft = (index: number) => {
        const draft = inlineNumericDraft[index];
        if (!draft) return;

        const item = purchaseItems[index];
        if (!item) return;

        const quantity = parseFloat(draft.quantity.replace(',', '.'));
        const unitCost = parseFloat(draft.unitCost.replace(',', '.'));

        if (Number.isFinite(quantity) && quantity > 0 && Number.isFinite(unitCost) && unitCost >= 0) {
            setPurchaseItems((prev) =>
                prev.map((it, i) =>
                    i === index
                        ? { ...it, quantity, unitCost, totalCost: quantity * unitCost }
                        : it
                )
            );
            if (editingItemIndex === index && itemEditDraft) {
                setItemEditDraft((prev) =>
                    prev
                        ? {
                              ...prev,
                              quantity: String(quantity),
                              unitCost: String(unitCost)
                          }
                        : prev
                );
            }
        }

        setInlineNumericDraft((prev) => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
    };

    const iniciarEdicaoItemLinha = (index: number) => {
        const item = purchaseItems[index];
        if (!item) return;
        setEditingItemIndex(index);
        setItemEditDraft(itemParaDraft(item));
    };

    const salvarEdicaoItemLinha = () => {
        if (editingItemIndex === null || !itemEditDraft) return;
        const atualizado = aplicarDraftNoItem(purchaseItems[editingItemIndex], itemEditDraft);
        if (!atualizado) {
            toast.error('Preencha nome, quantidade e valor unitário válidos');
            return;
        }
        setPurchaseItems((prev) =>
            prev.map((item, i) => (i === editingItemIndex ? { ...item, ...atualizado } : item))
        );
        limparFormularioAdicao();
        toast.success('Item atualizado');
    };

    const handleAddProduct = () => {
        if (!productToAdd.name?.trim() || !productToAdd.quantity || !productToAdd.cost) {
            toast.error('Preencha nome, quantidade e valor unitário do produto');
            return;
        }

        const quantity = parseFloat(productToAdd.quantity);
        const unitCost = parseFloat(productToAdd.cost);
        if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
            toast.error('Quantidade e valor unitário inválidos');
            return;
        }
        const totalCost = quantity * unitCost;

        const baseItem: ExtendedItem = {
            productId: '',
            productName: productToAdd.name.trim(),
            quantity,
            unitCost,
            totalCost,
            ncm: productToAdd.ncm,
            sku: productToAdd.sku,
            unidadeMedida: productToAdd.unidadeMedida || 'un'
        };

        if (editingItemIndex !== null) {
            const existente = purchaseItems[editingItemIndex];
            setPurchaseItems((prev) =>
                prev.map((item, i) =>
                    i === editingItemIndex
                        ? {
                              ...existente,
                              ...baseItem,
                              materialId: existente.materialId,
                              materialVinculado: existente.materialVinculado,
                              matchAutomatico: existente.matchAutomatico,
                              destinoEstoque: existente.destinoEstoque,
                              quantidadeFracionada: existente.quantidadeFracionada,
                              tipoEmbalagem: existente.tipoEmbalagem,
                              unidadeEmbalagem: existente.unidadeEmbalagem
                          }
                        : item
                )
            );
            limparFormularioAdicao();
            toast.success('Item atualizado na listagem');
            return;
        }

        setPurchaseItems((prev) => [...prev, baseItem]);
        limparFormularioAdicao();
        toast.success('Produto adicionado à listagem');
    };

    const handleRemoveProduct = (index: number) => {
        if (editingItemIndex === index) {
            limparFormularioAdicao();
        } else if (editingItemIndex !== null && index < editingItemIndex) {
            setEditingItemIndex(editingItemIndex - 1);
        }
        setInlineNumericDraft((prev) => {
            const next: Record<number, { quantity: string; unitCost: string }> = {};
            Object.entries(prev).forEach(([key, val]) => {
                const i = Number(key);
                if (i < index) next[i] = val;
                else if (i > index) next[i - 1] = val;
            });
            return next;
        });
        setPurchaseItems(prev => prev.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return valorTotalNotaCalculado;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (purchaseItems.length === 0) {
            toast.error('Adicione pelo menos um item à compra');
            return;
        }

        if (isCompraAvulsa && destinoTipo === 'OBRA' && !obraId) {
            toast.error('Selecione a obra em andamento');
            return;
        }
        if (isCompraAvulsa && destinoTipo === 'PROJETO' && !projetoId) {
            toast.error('Selecione a ordem de serviço (OS)');
            return;
        }

        // Validar se há pelo menos uma parcela na seção Faturas / Parcelas (Duplicatas)
        if (parcelas.length === 0) {
            toast.error('Registre no mínimo uma parcela para registrar essa compra!');
            return;
        }

        // Validar se as parcelas têm data e valor válidos
        const parcelasInvalidas = parcelas.filter(p => !p.dataVencimento || p.valor <= 0);
        if (parcelasInvalidas.length > 0) {
            toast.error('Existem parcelas incompletas', {
                description: 'Todas as parcelas devem ter data de vencimento e valor maior que zero.',
                duration: 5000
            });
            return;
        }

        if (meioPagamento === 'CARTAO_CREDITO' && !cartaoCreditoId) {
            toast.error('Selecione o cartão de crédito');
            return;
        }

        if (classificacaoVaiParaEstoque('COMPOSICAO_ESTOQUE')) {
            const pendentes = purchaseItems.filter((it) => {
                if (isCompraAvulsa && (it as ExtendedItem).destinoEstoque === false) return false;
                return itemPrecisaVinculoEstoque(it as ExtendedItem);
            });
            if (pendentes.length > 0) {
                toast.error('Há itens sem vínculo com o estoque', {
                    description: `${pendentes.length} item(ns) precisam ser vinculados a um material cadastrado ou marcados como item novo. O vínculo fica salvo para as próximas compras deste fornecedor.`,
                    duration: 7000,
                });
                return;
            }
        }

        try {
            // Se está editando, atualizar a compra completa
            if (purchaseToEdit) {
                console.log('✏️ Atualizando compra completa:', purchaseToEdit.id);
                
                const updatePayload = {
                    fornecedorNome: supplierName,
                    fornecedorCNPJ: onlyDigits(supplierCNPJ) || supplierCNPJ,
                    fornecedorTel: onlyDigits(supplierPhone) || undefined,
                    numeroNF: invoiceNumber,
                    serieNF: serieNF || '1',
                    dataEmissaoNF: dataEmissaoNF || purchaseDate,
                    dataCompra: purchaseDate,
                    dataRecebimento: dataRecebimentoCompra || undefined,
                    status: status,
                    valorFrete: parseFloat(frete || '0') || 0,
                    outrasDespesas: parseFloat(outrasDespesas || '0') || 0,
                    valorDesconto: parseFloat(descontos || '0') || 0,
                    condicoesPagamento: condicaoPagamento === 'PARCELADO' ? 'PARCELADO' : 'AVISTA',
                    meioPagamento,
                    cartaoCreditoId: meioPagamento === 'CARTAO_CREDITO' ? cartaoCreditoId : null,
                    destinatarioCNPJ: onlyDigits(destinatarioCNPJ) || destinatarioCNPJ || undefined,
                    valorIPI: parseFloat(valorIPI || '0') || 0,
                    valorTotalProdutos: totalProdutosCalculado,
                    valorTotalNota: valorTotalNotaCalculado,
                    duplicatas: parcelas,
                    empresaCompradoraNome: empresaCompradoraNome || undefined,
                    empresaCompradoraCNPJ: onlyDigits(empresaCompradoraCNPJ) || empresaCompradoraCNPJ || undefined,
                    observacoes: observacoesCompra
                };

                const response = await comprasService.updateCompra(purchaseToEdit.id, updatePayload);
                
                // reload list
                const data = await comprasService.getCompras();
                setPurchaseOrders(data);

                toast.success('✅ Compra atualizada com sucesso!');
                handleCloseModal();
                return;
            }

            // Se não está editando, criar nova compra
            const payload: any = {
                fornecedorNome: supplierName,
                fornecedorCNPJ: onlyDigits(supplierCNPJ) || supplierCNPJ,
                fornecedorTel: onlyDigits(supplierPhone) || undefined,
                numeroNF: invoiceNumber,
                serieNF: serieNF || '1',
                dataEmissaoNF: dataEmissaoNF || purchaseDate,
                dataCompra: purchaseDate,
                status: status,
                valorFrete: parseFloat(frete || '0') || 0,
                outrasDespesas: parseFloat(outrasDespesas || '0') || 0,
                valorDesconto: parseFloat(descontos || '0') || 0,
                items: purchaseItems.map((it) => ({
                    nomeProduto: it.productName,
                    quantidade: it.quantity,
                    valorUnit: it.unitCost,
                    ncm: (it as any).ncm,
                    sku: (it as any).sku,
                    unidadeMedida: (it as any).unidadeMedida || 'un',
                    materialId: (it as ExtendedItem).materialId,
                    codigoFornecedor: (it as ExtendedItem).codigoFornecedor,
                    ean: (it as ExtendedItem).ean,
                    criarNovoMaterial: (it as ExtendedItem).criarNovoMaterial,
                    // Campos de fracionamento
                    quantidadeFracionada: (it as any).quantidadeFracionada,
                    tipoEmbalagem: (it as any).tipoEmbalagem,
                    unidadeEmbalagem: (it as any).unidadeEmbalagem,
                    destinoEstoque: temClassificacaoDestino
                        ? it.destinoEstoque !== false
                        : true,
                })),
                observacoes: observacoesCompra.trim() || undefined,
                condicoesPagamento: condicaoPagamento === 'PARCELADO' ? 'PARCELADO' : 'AVISTA',
                meioPagamento,
                cartaoCreditoId: meioPagamento === 'CARTAO_CREDITO' ? cartaoCreditoId : null,
                destinatarioCNPJ: onlyDigits(destinatarioCNPJ) || destinatarioCNPJ || undefined,
                statusImportacao,
                valorIPI: parseFloat(valorIPI || '0') || 0,
                valorTotalProdutos: totalProdutosCalculado,
                valorTotalNota: valorTotalNotaCalculado,
                duplicatas: parcelas,
                destinoTipo:
                    isCompraAvulsa && destinoTipo !== 'ESTOQUE' ? destinoTipo : undefined,
                obraId: isCompraAvulsa && destinoTipo === 'OBRA' && obraId ? obraId : undefined,
                projetoId:
                    isCompraAvulsa && destinoTipo === 'PROJETO' && projetoId ? projetoId : undefined,
                empresaCompradoraNome: empresaCompradoraNome || undefined, // ✅ NOVO: Nome da empresa compradora
                empresaCompradoraCNPJ: onlyDigits(empresaCompradoraCNPJ) || empresaCompradoraCNPJ || undefined // ✅ NOVO: CNPJ da empresa compradora
            };

            console.log('📤 Criando nova compra:', payload);
            const response = await comprasService.createCompra(payload);
            const estatisticas = (response as any)?.estatisticas || (response as any)?.data?.estatisticas;

            // reload list
            const data = await comprasService.getCompras();
            setPurchaseOrders(data);

            // Exibir resumo se houver estatísticas
            if (estatisticas) {
                const mensagem = `✅ Compra registrada com sucesso!\n\n` +
                    `📦 ${estatisticas.materiaisIncrementados || 0} item(ns) tiveram estoque incrementado em materiais existentes\n` +
                    `🆕 ${estatisticas.materiaisCriados || 0} novo(s) material(is) foram criados`;
                toast.success('Compra registrada', {
                    description: mensagem,
                    duration: 5000
                });
            } else {
                toast.success('✅ Compra registrada com sucesso!');
            }
            handleCloseModal();
        } catch (error) {
            console.error('❌ Erro:', error);
            toast.error('❌ Erro ao processar compra');
        }
    };

    // XML Import handlers
    const handleXMLFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'text/xml') {
            setSelectedXMLFile(file);
            setXmlError(null);
        } else {
            toast.error('Por favor, selecione um arquivo XML válido');
        }
    };

    const processXMLImport = async () => {
        if (!selectedXMLFile) return;

        setIsProcessingXML(true);
        setXmlError(null);

        try {
            const xmlContent = await readFileAsText(selectedXMLFile);
            // Backend processa o XML agora
            // const parsedData = parseNFeXML(xmlContent);
            // setParsedXMLData(parsedData);
        } catch (error) {
            setXmlError('Erro ao processar arquivo XML: ' + (error as Error).message);
        } finally {
            setIsProcessingXML(false);
        }
    };

    // Novo: upload e preenchimento automático a partir do XML
    // fromInsideModal = true: chamado de dentro do modal de compra (não faz switch de modais)
    const handleXMLUpload = async (file: File | null | undefined, fromInsideModal = false) => {
        if (!file) {
            setXmlError('Nenhum arquivo selecionado.');
            return;
        }
        setIsProcessingXML(true);
        setXmlError(null);
        try {
            const xmlContent = await readFileAsText(file);
            console.log('📤 Enviando XML para processamento...');
            
            // Faz parsing no backend para garantir compatibilidade de estruturas
            const resp = await comprasService.parseXML(xmlContent);
            console.log('📥 Resposta COMPLETA do parse XML:', resp);
            console.log('📥 Tipo da resposta:', typeof resp);
            console.log('📥 Keys da resposta:', Object.keys(resp || {}));
            
            // O axiosApiService retorna { success: true, data: {...} }
            const data = (resp as any)?.data || (resp as any) || {};
            console.log('📋 Dados extraídos:', data);
            console.log('📋 Tipo dos dados:', typeof data);
            console.log('📋 Keys dos dados:', Object.keys(data || {}));

            // Preencher formulário com dados do backend
            console.log('🏢 Fornecedor do XML:', data.fornecedor);
            setSupplierName(data.fornecedor?.nome || '');
            setSupplierCNPJ(data.fornecedor?.cnpj || '');
            setSupplierAddress(data.fornecedor?.endereco || '');
            
            console.log('📄 Número NF:', data.numeroNF);
            setInvoiceNumber(data.numeroNF || '');
            
            console.log('📄 Série NF:', data.serieNF);
            setSerieNF(data.serieNF || '1');
            
            console.log('📅 Data Emissão:', data.dataEmissao);
            const dataEmissaoStr = data.dataEmissao ? String(data.dataEmissao).slice(0, 10) : new Date().toISOString().split('T')[0];
            setDataEmissaoNF(dataEmissaoStr);
            setPurchaseDate(dataEmissaoStr);
            
            console.log('📦 Items do XML:', data.items);
            setPurchaseItems(
                (data.items || []).map((it: any) => ({
                    productId: it.materialId || '',
                    productName: it.nomeProduto || '',
                    quantity: it.quantidade || 0,
                    unitCost: it.valorUnit || 0,
                    totalCost: (it.quantidade || 0) * (it.valorUnit || 0),
                    ncm: it.ncm || '',
                    sku: it.sku || '',
                    unidadeMedida: it.unidadeMedida || 'un',
                    materialId: it.materialId,
                    materialVinculado: it.materialVinculado,
                    matchAutomatico: !!it.matchAutomatico,
                    matchTipo: it.matchTipo || null,
                    codigoFornecedor: it.codigoFornecedor || it.sku || '',
                    ean: it.ean || '',
                    criarNovoMaterial: false,
                }))
            );
            
            // Log dos matches automáticos
            const matchesAutomaticos = (data.items || []).filter((it: any) => it.matchAutomatico).length;
            const pendentes = (data.items || []).filter((it: any) => !it.materialId).length;
            if (matchesAutomaticos > 0 || pendentes > 0) {
                toast.info(
                    `${matchesAutomaticos} item(ns) vinculados automaticamente. ${pendentes} precisam de vínculo com o estoque.`
                );
            }

            console.log('💰 Valores do XML:', {
                frete: data.valorFrete,
                outrasDespesas: data.outrasDespesas,
                ipi: data.valorIPI,
                totalProdutos: data.valorTotalProdutos,
                totalNota: data.valorTotalNota
            });

            // Custos e Totais
            setFrete(String(data.valorFrete ?? '0'));
            setOutrasDespesas(String(data.outrasDespesas ?? '0'));
            setDescontos(String(data.valorDesconto ?? '0'));
            setValorIPI(String(data.valorIPI ?? '0'));

            // Destinatário e Empresa Compradora (garantir string para .replace)
            const cnpjDest = String(data.destinatarioCNPJ || '');
            setDestinatarioCNPJ(cnpjDest);
            if (cnpjDest && empresasFiscais.length > 0) {
                const cnpjLimpo = cnpjDest.replace(/\D/g, '');
                const empresaMatch = empresasFiscais.find((e: any) => (e.cnpj || '').replace(/\D/g, '') === cnpjLimpo);
                if (empresaMatch) {
                    setEmpresaCompradoraId(empresaMatch.id);
                    setEmpresaCompradoraNome(empresaMatch.razaoSocial || empresaMatch.nomeFantasia || '');
                    setEmpresaCompradoraCNPJ(empresaMatch.cnpj || '');
                }
            }
            setStatusImportacao('XML');

            // Duplicatas / Parcelas
            if (Array.isArray(data.parcelas) && data.parcelas.length > 0) {
                const parcelasXML = data.parcelas.map((d: any, idx: number) => ({
                    numero: d.numero || d.nDup || String(idx + 1).padStart(3, '0'),
                    dataVencimento: (d.dataVencimento || d.dVenc || '').slice(0, 10),
                    valor: parseFloat(String(d.valor || d.vDup || 0))
                }));
                
                setDuplicatas(parcelasXML);
                setParcelas(parcelasXML);
                
                // Se tem duplicatas, configurar como PARCELADO
                setCondicaoPagamento('PARCELADO');
                setNumParcelas(String(parcelasXML.length));
                setDataPrimeiroVencimento(parcelasXML[0]?.dataVencimento || '');
            } else {
                // Se não tem duplicatas no XML, mantém à vista
                setDuplicatas([]);
                setParcelas([]);
                setCondicaoPagamento('AVISTA');
                setNumParcelas('1');
                setDataPrimeiroVencimento('');
            }

            console.log('✅ XML processado com sucesso!');
            console.log('📝 Estados populados:');
            console.log('  - Fornecedor:', data.fornecedor?.nome || '❌ VAZIO');
            console.log('  - CNPJ:', data.fornecedor?.cnpj || '❌ VAZIO');
            console.log('  - NF:', data.numeroNF || '❌ VAZIO');
            console.log('  - Items:', (data.items || []).length, 'itens');

            if (fromInsideModal) {
                setShowXMLImportInsideModal(false);
                setSelectedXMLFile(null);
                toast.success('XML importado com sucesso!', {
                    description: `${(data.items || []).length} itens carregados. Revise e salve a compra.`,
                    duration: 4000
                });
            } else {
                setIsXMLModalOpen(false);
                setTimeout(() => {
                    setIsModalOpen(true);
                    console.log('🎯 Modal de compra aberto!');
                    toast.success('XML importado com sucesso!', {
                        description: `${(data.items || []).length} itens carregados. Revise e salve a compra.`,
                        duration: 4000
                    });
                }, 100);
            }
        } catch (error) {
            console.error('❌ Erro ao processar XML:', error);
            setXmlError('Erro ao processar arquivo XML: ' + (error as Error).message);
            toast.error('Erro ao processar XML', {
                description: error instanceof Error ? error.message : 'Erro desconhecido'
            });
        } finally {
            setIsProcessingXML(false);
        }
    };

    const confirmXMLImport = () => {
        if (!parsedXMLData) return;

        // Preencher formulário com dados do XML
        setSupplierName(parsedXMLData.vendor.name);
        setSupplierCNPJ(parsedXMLData.vendor.cnpj);
        setSupplierAddress(parsedXMLData.vendor.address);
        setInvoiceNumber(parsedXMLData.invoice.number);
        setPurchaseDate(parsedXMLData.invoice.emissionDate);
        setPurchaseItems(parsedXMLData.items);

        // Fechar modal XML e abrir modal de compra
        setIsXMLModalOpen(false);
        setIsModalOpen(true);
    };

    // Excluir compra
    const handleDeleteCompra = async () => {
        if (!purchaseToDelete) return;

        const response = await comprasService.excluir(purchaseToDelete.id);
        
        if (response.success) {
            toast.success('Compra excluída', {
                description: `Compra #${purchaseToDelete.numeroSequencial || purchaseToDelete.invoiceNumber || purchaseToDelete.id.slice(0, 8)} foi excluída permanentemente`
            });
            await loadPurchaseOrders();
        } else {
            toast.error('Erro ao excluir', {
                description: response.error || 'Não foi possível excluir a compra'
            });
        }

        setShowDeleteDialog(false);
        setPurchaseToDelete(null);
    };

    // Cancelar compra
    const handleCancelCompra = async () => {
        if (!purchaseToCancel) return;

        const response = await comprasService.cancelarCompra(purchaseToCancel.id);
        
        if (response.success) {
            toast.success('Compra cancelada', {
                description: `Compra #${purchaseToCancel.numeroSequencial || purchaseToCancel.invoiceNumber || purchaseToCancel.id.slice(0, 8)} foi cancelada com sucesso`
            });
            await loadPurchaseOrders();
        } else {
            toast.error('Erro ao cancelar', {
                description: response.error || 'Não foi possível cancelar a compra'
            });
        }

        setShowCancelDialog(false);
        setPurchaseToCancel(null);
    };

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in min-w-0">
                <div className="flex items-center gap-4 min-w-0">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Compras</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Gerencie pedidos de compra e fornecedores</p>
                    </div>
                </div>
                <ScrollableRow className="w-full sm:w-auto justify-start sm:justify-end">
                    <button
                        onClick={() => setIsXMLModalOpen(true)}
                        className={`${scrollableNavItemClasses} flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold`}
                    >
                        <DocumentArrowUpIcon className="w-5 h-5" />
                        Importar XML
                    </button>
                    <button
                        onClick={() => handleOpenModal(null, true)}
                        className={`${scrollableNavItemClasses} flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-medium font-semibold`}
                    >
                        <PlusIcon className="w-5 h-5" />
                        Compra Avulsa
                    </button>
                    <button
                        onClick={() => navigate('/compras/nova')}
                        className={`${scrollableNavItemClasses} flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-medium font-semibold`}
                    >
                        <PlusIcon className="w-5 h-5" />
                        Nova Compra
                    </button>
                </ScrollableRow>
            </header>

            {/* Filtros */}
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por fornecedor ou número da NF..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>
                    </div>

                    <div>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as PurchaseStatus | 'Todos')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="Todos">Todos os Status</option>
                            <option value={PurchaseStatus.Pendente}>Pendente</option>
                            <option value={PurchaseStatus.Recebido}>Recebido</option>
                            <option value={PurchaseStatus.Cancelado}>Cancelado</option>
                        </select>
                    </div>
                    <div>
                        <select
                            value={filterEmpresaCNPJ}
                            onChange={(e) => setFilterEmpresaCNPJ(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                            title="Filtrar por empresa compradora (CNPJ)"
                        >
                            <option value="">Todas as empresas</option>
                            {empresasFiscais.map((empresa) => (
                                <option key={empresa.id} value={empresa.cnpj || ''}>
                                    {empresa.razaoSocial || empresa.nomeFantasia || empresa.cnpj || 'Empresa'}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm text-gray-600">
                        Exibindo <span className="font-bold text-gray-900">{filteredPurchases.length}</span> de <span className="font-bold text-gray-900">{purchaseOrders.length}</span> compras
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <ViewToggle view={viewMode} onViewChange={handleViewModeChange} />
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Pendente: {purchaseOrders.filter(p => p.status === PurchaseStatus.Pendente).length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Recebido: {purchaseOrders.filter(p => p.status === PurchaseStatus.Recebido).length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Cancelado: {purchaseOrders.filter(p => p.status === PurchaseStatus.Cancelado).length}</span>
                        </div>
                        <span className="text-xs text-gray-400 hidden sm:inline">|</span>
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-4 bg-blue-600 rounded-sm" title="Faturado" />
                            <span className="text-xs text-gray-600">Faturado (parcelas quitadas)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-4 bg-orange-500 rounded-sm" title="Recebido" />
                            <span className="text-xs text-gray-600">Recebido (sem pagamento ou sem parcelas)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-4 bg-yellow-400 rounded-sm" title="Pago parcial" />
                            <span className="text-xs text-gray-600">Pago parcial</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid/Lista de Compras */}
            {filteredPurchases.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">🛒</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhuma compra encontrada</h3>
                    <p className="text-gray-500 mb-6">
                        {searchTerm || filter !== 'Todos'
                            ? 'Tente ajustar os filtros de busca'
                            : 'Comece registrando sua primeira compra'}
                    </p>
                    {!searchTerm && filter === 'Todos' && (
                        <button
                            onClick={() => navigate('/compras/nova')}
                            className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-6 py-3 rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-medium font-semibold"
                        >
                            <PlusIcon className="w-5 h-5 inline mr-2" />
                            Registrar Primeira Compra
                        </button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPurchases.map((purchase) => {
                        const lateral = getCompraBadgeLateral(purchase);
                        return (
                        <div
                            key={purchase.id}
                            className="flex rounded-2xl overflow-hidden border-2 border-gray-200 shadow-soft hover:shadow-medium hover:border-orange-300 transition-all duration-200 bg-white"
                        >
                            <div
                                className={`w-1.5 shrink-0 min-h-[8rem] ${lateral.barClass}`}
                                title={lateral.tag || undefined}
                                aria-hidden
                            />
                            <div className="flex-1 p-6 min-w-0">
                            {/* Header do Card */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <div className="flex flex-col gap-0.5 mb-1">
                                        <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded w-fit">
                                            Compra #{purchase.numeroSequencial || 'N/A'}
                                        </span>
                                        {lateral.tag && (
                                            <span className={`text-[10px] font-bold tracking-wider ${lateral.tagClass}`}>
                                                {lateral.tag}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900 mb-1">{purchase.supplierName}</h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-3 py-1 text-xs font-bold rounded-lg bg-orange-100 text-orange-800 ring-1 ring-orange-200">
                                        🛒 Compra
                                    </span>
                                    {purchase.obra && (
                                        <span className="px-3 py-1 text-xs font-bold rounded-lg bg-purple-100 text-purple-800 ring-1 ring-purple-200" title={`Obra: ${purchase.obra.nomeObra}`}>
                                            🏗️ {purchase.obra.nomeObra}
                                        </span>
                                    )}
                                </div>
                                </div>
                                <span className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${getStatusClass(purchase.status)}`}>
                                    {purchase.status === PurchaseStatus.Pendente && '⏳ '}
                                    {purchase.status === PurchaseStatus.Recebido && '✅ '}
                                    {purchase.status === PurchaseStatus.Cancelado && '❌ '}
                                    {purchase.status}
                                </span>
                            </div>

                            {/* Informações */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>📄</span>
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{purchase.invoiceNumber}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>💰</span>
                                    <span className="font-bold text-orange-700">
                                        R$ {(purchase.totalAmount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>📅</span>
                                    <span>
                                        {new Date(purchase.orderDate || purchase.data || new Date().toISOString()).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>📦</span>
                                    <span>{purchase.items.length} item(s)</span>
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                <button
                                    onClick={async () => {
                                        try {
                                            // ✅ FORÇAR recarregamento completo sempre que abrir o modal
                                            console.log('🔄 Carregando detalhes completos da compra:', purchase.id);
                                            const compraCompleta = await comprasService.getCompraById(purchase.id);
                                            console.log('✅ Compra carregada:', compraCompleta);
                                            console.log('📦 Itens com dados:', compraCompleta.items?.map((it: any) => ({
                                                nome: it.productName,
                                                ncm: (it as any).material?.ncm || (it as any).ncm,
                                                sku: (it as any).material?.sku || (it as any).sku
                                            })));
                                            setPurchaseToView(compraCompleta);
                                        } catch (error) {
                                            console.error('Erro ao buscar compra completa:', error);
                                            toast.error('Erro ao carregar detalhes da compra');
                                            setPurchaseToView(purchase);
                                        }
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                >
                                    <EyeIcon className="w-4 h-4" />
                                    Ver Detalhes
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            console.log('✏️ Carregando compra para edição:', purchase.id);
                                            const compraCompleta = await comprasService.getCompraById(purchase.id);
                                            handleOpenModal(compraCompleta);
                                        } catch (error) {
                                            console.error('Erro ao carregar compra para edição:', error);
                                            toast.error('Erro ao carregar compra para edição');
                                        }
                                    }}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg transition-colors text-sm font-semibold"
                                    title="Editar compra (parcelas e datas)"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    Editar
                                </button>
                                {purchase.status === PurchaseStatus.Pendente && !isCompraDespesasVariadas(purchase) && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setPurchaseToView(purchase);
                                                handleOpenReceivingModal();
                                            }}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-semibold"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Receber
                                        </button>
                                        <button
                                            onClick={() => {
                                                setPurchaseToCancel(purchase);
                                                setShowCancelDialog(true);
                                            }}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-semibold"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                            Cancelar
                                        </button>
                                    </>
                                )}
                                {canDelete(user) && (
                                    <button
                                        onClick={() => {
                                            setPurchaseToDelete(purchase);
                                            setShowDeleteDialog(true);
                                        }}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
                                        title="Excluir compra (apenas Desenvolvedor/Administrador)"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        Excluir
                                    </button>
                                )}
                            </div>
                            </div>
                        </div>
                    );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Compra nº</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fornecedor</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Nº NF</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Data</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Valor Total</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Itens</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredPurchases.map((purchase) => {
                                    const lateralRow = getCompraBadgeLateral(purchase);
                                    return (
                                    <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                                        <td className={`px-6 py-4 whitespace-nowrap ${getCompraRowBorderClass(purchase)}`}>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-bold text-orange-700">
                                                    #{purchase.numeroSequencial || 'N/A'}
                                                </span>
                                                {lateralRow.tag && (
                                                    <span className={`text-[10px] font-bold tracking-wider ${lateralRow.tagClass}`}>
                                                        {lateralRow.tag}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-bold text-gray-900">{purchase.supplierName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="font-mono text-sm text-gray-600">{purchase.invoiceNumber}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-600">
                                                {new Date(purchase.orderDate || purchase.data || new Date().toISOString()).toLocaleDateString('pt-BR')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="font-bold text-orange-700">
                                                R$ {(purchase.totalAmount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-600">{purchase.items.length} item(s)</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${getStatusClass(purchase.status)}`}>
                                                {purchase.status === PurchaseStatus.Pendente && '⏳ '}
                                                {purchase.status === PurchaseStatus.Recebido && '✅ '}
                                                {purchase.status === PurchaseStatus.Cancelado && '❌ '}
                                                {purchase.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            // ✅ FORÇAR recarregamento completo sempre que abrir o modal
                                                            console.log('🔄 Carregando detalhes completos da compra:', purchase.id);
                                                            const compraCompleta = await comprasService.getCompraById(purchase.id);
                                                            console.log('✅ Compra carregada:', compraCompleta);
                                                            setPurchaseToView(compraCompleta);
                                                        } catch (error) {
                                                            console.error('Erro ao buscar compra completa:', error);
                                                            toast.error('Erro ao carregar detalhes da compra');
                                                            setPurchaseToView(purchase);
                                                        }
                                                    }}
                                                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                                    title="Ver detalhes"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            console.log('✏️ Carregando compra para edição:', purchase.id);
                                                            const compraCompleta = await comprasService.getCompraById(purchase.id);
                                                            handleOpenModal(compraCompleta);
                                                        } catch (error) {
                                                            console.error('Erro ao carregar compra para edição:', error);
                                                            toast.error('Erro ao carregar compra para edição');
                                                        }
                                                    }}
                                                    className="px-3 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg transition-colors text-sm font-semibold"
                                                    title="Editar compra (parcelas e datas)"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                {canDelete(user) && (
                                                    <button
                                                        onClick={() => {
                                                            setPurchaseToDelete(purchase);
                                                            setShowDeleteDialog(true);
                                                        }}
                                                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
                                                        title="Excluir compra (apenas Desenvolvedor/Administrador)"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {purchase.status === PurchaseStatus.Pendente && !isCompraDespesasVariadas(purchase) && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setPurchaseToView(purchase);
                                                                handleOpenReceivingModal();
                                                            }}
                                                            className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-semibold"
                                                            title="Receber remessa"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setPurchaseToCancel(purchase);
                                                                setShowCancelDialog(true);
                                                            }}
                                                            className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-semibold"
                                                            title="Cancelar compra"
                                                        >
                                                            <XMarkIcon className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
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

            {/* Dialog de Cancelamento */}
            <AlertDialog
                isOpen={showCancelDialog}
                onClose={() => {
                    setShowCancelDialog(false);
                    setPurchaseToCancel(null);
                }}
                onConfirm={handleCancelCompra}
                title="Cancelar Compra"
                message={
                    purchaseToCancel
                        ? `Tem certeza que deseja cancelar a Compra #${purchaseToCancel.numeroSequencial || purchaseToCancel.invoiceNumber || 'N/A'}?\n\nEsta ação cancelará também todas as contas a pagar vinculadas a esta compra.`
                        : 'Tem certeza que deseja cancelar esta compra?'
                }
                confirmText="Cancelar Compra"
                cancelText="Manter Compra"
                variant="warning"
            />

            {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-strong max-w-7xl w-full max-h-[95vh] overflow-y-auto animate-slide-in-up">
                        {/* Header */}
                        <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-orange-600 to-orange-700">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-medium">
                                    {purchaseToEdit ? <PencilIcon className="w-7 h-7 text-white" /> : <PlusIcon className="w-7 h-7 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-white">
                                        {purchaseToEdit ? 'Editar Compra' : isCompraAvulsa ? 'Compra Avulsa' : 'Nova Compra'}
                                    </h2>
                                    <p className="text-sm text-white/80 mt-1">
                                        {purchaseToEdit ? 'Atualize as informações da compra' : 'Registre uma nova compra ou pedido'}
                                    </p>
                                </div>
                            </div>
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowXMLImportInsideModal(!showXMLImportInsideModal);
                                        setXmlError(null);
                                        setSelectedXMLFile(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all font-semibold"
                                >
                                    <DocumentArrowUpIcon className="w-5 h-5" />
                                    Importar XML da NF-e
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-xl"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {purchaseToEdit?.status === PurchaseStatus.Recebido && (
                            <div className="mx-6 mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-sm">
                                Compra já recebida: você pode corrigir <strong>NF, fornecedor, datas, parcelas e valores</strong>. Os itens da nota não são alterados por aqui (evita divergência com o estoque).
                            </div>
                        )}

                        {/* Seção de Importar XML (dentro do modal) */}
                        {showXMLImportInsideModal && (
                            <div className="mx-6 mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                    <DocumentArrowUpIcon className="w-5 h-5 text-blue-600" />
                                    Importar XML da NF-e
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Selecione um arquivo XML da NF-e para preencher automaticamente todos os campos da compra (fornecedor, itens, parcelas, valores).
                                </p>
                                <div className="space-y-4">
                                    <input
                                        type="file"
                                        accept=".xml"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setSelectedXMLFile(file);
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-700 file:font-semibold file:cursor-pointer hover:file:bg-blue-200"
                                    />
                                    {xmlError && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                                            <p className="text-red-800 dark:text-red-300 font-medium">❌ {xmlError}</p>
                                        </div>
                                    )}
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowXMLImportInsideModal(false);
                                                setXmlError(null);
                                                setSelectedXMLFile(null);
                                            }}
                                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-all font-semibold"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => selectedXMLFile && handleXMLUpload(selectedXMLFile, true)}
                                            disabled={!selectedXMLFile || isProcessingXML}
                                            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isProcessingXML ? 'Processando...' : 'Processar e Preencher'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Informações do Fornecedor */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações do Fornecedor</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="relative md:col-span-2" ref={fornecedorDropdownRef}>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Nome do Fornecedor *
                                        </label>
                                        <input
                                            type="search"
                                            value={supplierName}
                                            onChange={(e) => {
                                                setSupplierName(e.target.value);
                                                setShowFornecedorDropdown(true);
                                            }}
                                            onFocus={() => setShowFornecedorDropdown(true)}
                                            required
                                            autoComplete="off"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            placeholder="Digite para buscar fornecedores cadastrados ou o nome da empresa"
                                        />
                                        {showFornecedorDropdown && fornecedoresFiltrados.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                                                {fornecedoresFiltrados.map((f) => (
                                                    <button
                                                        key={f.id}
                                                        type="button"
                                                        onClick={() => handleSelecionarFornecedor(f)}
                                                        className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b border-gray-100 last:border-b-0 transition-colors"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-medium text-gray-900">{f.nome}</span>
                                                            {f.cnpj && (
                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono shrink-0">
                                                                    {f.cnpj}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {f.endereco && (
                                                            <div className="text-xs text-gray-500 mt-0.5 truncate">{f.endereco}</div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            CNPJ
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={supplierCNPJ}
                                            onChange={handleCnpjFornecedorChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            placeholder="00.000.000/0000-00"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Telefone
                                        </label>
                                        <input
                                            type="tel"
                                            inputMode="tel"
                                            value={supplierPhone}
                                            onChange={handlePhoneChangeEdit}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={supplierEmail}
                                            onChange={(e) => setSupplierEmail(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            placeholder="contato@fornecedor.com"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Endereço
                                        </label>
                                        <input
                                            type="text"
                                            value={supplierAddress}
                                            onChange={(e) => setSupplierAddress(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            placeholder="Endereço completo do fornecedor"
                                        />
                                    </div>
                                </div>
                            </div>

                            {isCompraAvulsa && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">🏗️</span>
                                        Classificação da compra avulsa
                                    </h3>
                                    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-6 space-y-4">
                                        <div className="flex flex-wrap gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="destinoTipo"
                                                    checked={destinoTipo === 'ESTOQUE'}
                                                    onChange={() => {
                                                        setDestinoTipo('ESTOQUE');
                                                        setObraId('');
                                                        setProjetoId('');
                                                    }}
                                                />
                                                <span className="text-sm font-medium">Composição de estoque</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="destinoTipo"
                                                    checked={destinoTipo === 'OBRA'}
                                                    onChange={() => setDestinoTipo('OBRA')}
                                                />
                                                <span className="text-sm font-medium">Obra em andamento</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="destinoTipo"
                                                    checked={destinoTipo === 'PROJETO'}
                                                    onChange={() => setDestinoTipo('PROJETO')}
                                                />
                                                <span className="text-sm font-medium">Ordem de serviço (OS)</span>
                                            </label>
                                        </div>

                                        {destinoTipo === 'OBRA' && (
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Obra em andamento *
                                                </label>
                                                <select
                                                    value={obraId}
                                                    onChange={(e) => setObraId(e.target.value)}
                                                    required
                                                    className="w-full px-4 py-3 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
                                                >
                                                    <option value="">Selecione uma obra</option>
                                                    {obrasEmAndamento.map((obra) => (
                                                        <option key={obra.id} value={obra.id}>
                                                            {obra.nomeObra} —{' '}
                                                            {obra.status === 'ANDAMENTO'
                                                                ? 'Em andamento'
                                                                : 'A fazer'}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {destinoTipo === 'PROJETO' && (
                                            <div className="relative">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    Buscar OS *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={projetoSearch}
                                                    onChange={(e) => {
                                                        setProjetoSearch(e.target.value);
                                                        setProjetoId('');
                                                        setProjetoLabel('');
                                                    }}
                                                    placeholder="Nº OS, título ou cliente..."
                                                    className="w-full px-4 py-3 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
                                                />
                                                {showProjetoDropdown && projetoOptions.length > 0 && (
                                                    <ul className="absolute z-20 mt-1 w-full bg-white border border-purple-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                        {projetoOptions.map((p) => (
                                                            <li key={p.id}>
                                                                <button
                                                                    type="button"
                                                                    className="w-full text-left px-4 py-2 hover:bg-purple-50 text-sm"
                                                                    onClick={() => {
                                                                        setProjetoId(p.id);
                                                                        const label = `${p.numeroOs || 'OS'} · ${p.titulo}${p.cliente?.nome ? ` · ${p.cliente.nome}` : ''}`;
                                                                        setProjetoLabel(label);
                                                                        setProjetoSearch(label);
                                                                        setShowProjetoDropdown(false);
                                                                    }}
                                                                >
                                                                    {p.numeroOs ? `${p.numeroOs} · ` : ''}
                                                                    {p.titulo}
                                                                    {p.cliente?.nome ? ` · ${p.cliente.nome}` : ''}
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                {projetoId && (
                                                    <p className="text-xs text-purple-600 mt-1">
                                                        OS selecionada: {projetoLabel || projetoId}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {temClassificacaoDestino && (
                                            <div className="flex flex-wrap gap-2 pt-2 border-t border-purple-200">
                                                <button
                                                    type="button"
                                                    onClick={() => marcarTodosItensDestino(true)}
                                                    className="px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                                >
                                                    Todos para destino
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => marcarTodosItensDestino(false)}
                                                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-100"
                                                >
                                                    Todos para estoque
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Informações da Compra */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações da Compra</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Número da NF *
                                        </label>
                                        <input
                                            type="text"
                                            value={invoiceNumber}
                                            onChange={(e) => setInvoiceNumber(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            placeholder="NF-000123"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Data da Compra
                                        </label>
                                        <input
                                            type="date"
                                            value={purchaseDate}
                                            onChange={(e) => setPurchaseDate(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Data de recebimento (chegada)
                                        </label>
                                        <input
                                            type="date"
                                            value={dataRecebimentoCompra}
                                            onChange={(e) => setDataRecebimentoCompra(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            title="Quando a mercadoria ou o serviço foi efetivamente recebido"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Data de Emissão da NF
                                        </label>
                                        <input
                                            type="date"
                                            value={dataEmissaoNF}
                                            onChange={(e) => setDataEmissaoNF(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            title="Data de emissão contida na nota fiscal (XML)"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Status
                                        </label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value as PurchaseStatus)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                        >
                                            <option value={PurchaseStatus.Pendente}>Pendente</option>
                                            <option value={PurchaseStatus.Recebido}>Recebido</option>
                                            <option value={PurchaseStatus.Cancelado}>Cancelado</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">CNPJ Destinatário</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={destinatarioCNPJ}
                                            onChange={handleCnpjDestinatarioChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            placeholder="00.000.000/0000-00"
                                        />
                                    </div>
                                </div>

                                {/* ✅ NOVO: Empresa Compradora */}
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">🏢</span>
                                        Empresa Compradora
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="md:col-span-1">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Selecionar Empresa
                                            </label>
                                            <select
                                                value={empresaCompradoraId}
                                                onChange={(e) => handleEmpresaCompradoraChange(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                                            >
                                                <option value="">Selecione uma empresa...</option>
                                                {empresasFiscais.map((empresa) => (
                                                    <option key={empresa.id} value={empresa.id}>
                                                        {empresa.razaoSocial || empresa.nomeFantasia} - {empresa.cnpj}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Nome da Empresa
                                            </label>
                                            <input
                                                type="text"
                                                value={empresaCompradoraNome}
                                                onChange={(e) => setEmpresaCompradoraNome(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                                placeholder="Nome/Razão Social"
                                                readOnly
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                CNPJ da Empresa
                                            </label>
                                            <input
                                                type="text"
                                                value={empresaCompradoraCNPJ}
                                                onChange={(e) => setEmpresaCompradoraCNPJ(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                                placeholder="00.000.000/0000-00"
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-2">
                                        💡 Selecione a empresa compradora para identificar qual CNPJ está sendo usado nesta compra
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Status de Importação</label>
                                        <select
                                            value={statusImportacao}
                                            onChange={(e) => setStatusImportacao(e.target.value as any)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                        >
                                            <option value="MANUAL">Manual</option>
                                            <option value="XML">XML</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col justify-end">
                                        <p className="text-sm text-gray-500">
                                            Total de produtos e total da nota são calculados automaticamente em <strong>Custos e Pagamento</strong> e no resumo.
                                        </p>
                                    </div>
                                </div>
                                
                            </div>

                            {/* Itens da Compra */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Itens da Compra</h3>
                                
                                {/* Adicionar Produto */}
                                <div
                                    className={`bg-gray-50 border p-4 rounded-xl mb-4 ${
                                        editingItemIndex !== null ? 'border-amber-400 ring-2 ring-amber-200' : 'border-gray-200'
                                    }`}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                        <h4 className="font-medium text-gray-800">
                                            {editingItemIndex !== null ? 'Editar item da listagem' : 'Adicionar Item'}
                                        </h4>
                                        {editingItemIndex !== null && (
                                            <button
                                                type="button"
                                                onClick={limparFormularioAdicao}
                                                className="text-sm text-gray-600 hover:text-gray-900 underline"
                                            >
                                                Cancelar edição
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                        <div>
                                            <input
                                                type="text"
                                                value={productToAdd.name}
                                                onChange={(e) => setProductToAdd({ ...productToAdd, name: e.target.value })}
                                                placeholder="Nome do produto"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                value={productToAdd.quantity}
                                                onChange={(e) => setProductToAdd({...productToAdd, quantity: e.target.value})}
                                                placeholder="Quantidade"
                                                min="1"
                                                step="0.01"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                value={productToAdd.cost}
                                                onChange={(e) => setProductToAdd({...productToAdd, cost: e.target.value})}
                                                placeholder="Valor unitário"
                                                min="0"
                                                step="0.01"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={productToAdd.ncm ?? ''}
                                                onChange={(e) => setProductToAdd({...productToAdd, ncm: e.target.value})}
                                                placeholder="NCM"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={productToAdd.sku ?? ''}
                                                onChange={(e) => setProductToAdd({...productToAdd, sku: e.target.value})}
                                                placeholder="SKU (opcional)"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>
                                        <div>
                                            <button
                                                type="button"
                                                onClick={handleAddProduct}
                                                className={`w-full px-4 py-2 text-white rounded-lg transition-all font-semibold ${
                                                    editingItemIndex !== null
                                                        ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600'
                                                        : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600'
                                                }`}
                                            >
                                                {editingItemIndex !== null ? 'Salvar alterações' : 'Adicionar'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Lista de Itens */}
                                {purchaseItems.length > 0 && purchaseItems.some((it) => itemPrecisaVinculoEstoque(it as ExtendedItem)) && (
                                    <div className="mb-3 px-4 py-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-sm text-orange-800 dark:text-orange-200">
                                        {purchaseItems.filter((it) => itemPrecisaVinculoEstoque(it as ExtendedItem)).length} item(ns) precisam ser vinculados ao estoque.
                                        O vínculo fica salvo: na próxima compra deste fornecedor o sistema casa sozinho, mesmo com nome diferente.
                                    </div>
                                )}
                                {purchaseItems.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <span className="text-2xl">📦</span>
                                        </div>
                                        <p className="text-gray-500 font-medium">Nenhum item adicionado</p>
                                        <p className="text-gray-400 text-sm mt-1">Adicione produtos à sua compra</p>
                                    </div>
                                ) : (
                                    <div className="border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-dark-border">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Produto</th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Qtd</th>
                                                        <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Valor Unit.</th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">NCM</th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">SKU</th>
                                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Subtotal</th>
                                                        {temClassificacaoDestino && (
                                                            <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                                                Destino
                                                            </th>
                                                        )}
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
                                                    {purchaseItems.map((item, index) => {
                                                        const materiaisFiltradosItem = getMateriaisFiltradosPorItem(index);
                                                        const mostraBusca = buscaMaterialPorItem[index] !== undefined;
                                                        const itemExtended = item as ExtendedItem;
                                                        
                                                        return (
                                                            <React.Fragment key={index}>
                                                                <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                                                                    editingItemIndex === index ? 'bg-amber-50/80 dark:bg-amber-900/10' : ''
                                                                }`}>
                                                                    <td className="px-6 py-4">
                                                                        {editingItemIndex === index && itemEditDraft ? (
                                                                            <input
                                                                                type="text"
                                                                                value={itemEditDraft.productName}
                                                                                onChange={(e) => setItemEditDraft({ ...itemEditDraft, productName: e.target.value })}
                                                                                className="w-full px-2 py-1.5 border border-gray-300 dark:border-dark-border rounded-lg text-sm dark:bg-dark-bg dark:text-white"
                                                                            />
                                                                        ) : (
                                                                        <div>
                                                                            <p className="font-semibold text-gray-900 dark:text-dark-text text-sm">{item.productName}</p>
                                                                            {(item as any).quantidadeFracionada && item.quantity && (
                                                                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                                                    📦 {item.quantity} {(item as any).tipoEmbalagem?.toLowerCase() || 'embalagens'} = {item.quantity * (item as any).quantidadeFracionada} unidades
                                                                                </p>
                                                                            )}
                                                                            {/* Indicadores de vinculação */}
                                                                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                                                                                {(() => {
                                                                                    const vinculo = rotuloVinculoItem(itemExtended);
                                                                                    return (
                                                                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${classesTomVinculo(vinculo.tom)}`}>
                                                                                            {vinculo.texto}
                                                                                        </span>
                                                                                    );
                                                                                })()}
                                                                                {itemPrecisaVinculoEstoque(itemExtended) && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => marcarItemComoNovo(index)}
                                                                                        className="text-xs text-blue-700 hover:text-blue-900 underline"
                                                                                    >
                                                                                        Criar como item novo
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        )}
                                                                    </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <input
                                                                    type="number"
                                                                    min="0.01"
                                                                    step="0.01"
                                                                    value={getInlineNumericDisplay(index, 'quantity', item)}
                                                                    onChange={(e) =>
                                                                        handleInlineNumericChange(index, 'quantity', e.target.value)
                                                                    }
                                                                    onBlur={() => commitInlineNumericDraft(index)}
                                                                    title="Quantidade"
                                                                    className="w-20 px-2 py-1 border border-gray-300 dark:border-dark-border rounded-md text-sm text-center dark:bg-dark-bg dark:text-white focus:ring-2 focus:ring-orange-400"
                                                                />
                                                                {item.unidadeMedida && (
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 block mt-1">
                                                                        {item.unidadeMedida}
                                                                    </span>
                                                                )}
                                                                {(item as any).quantidadeFracionada && (
                                                                    <span className="text-blue-600 dark:text-blue-400 ml-1 text-xs block">
                                                                        ({(item as any).tipoEmbalagem?.toLowerCase() || 'embalagens'})
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4 text-right">
                                                                <div className="inline-flex items-center justify-end gap-1">
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">R$</span>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        value={getInlineNumericDisplay(index, 'unitCost', item)}
                                                                        onChange={(e) =>
                                                                            handleInlineNumericChange(index, 'unitCost', e.target.value)
                                                                        }
                                                                        onBlur={() => commitInlineNumericDraft(index)}
                                                                        title="Valor unitário"
                                                                        className="w-28 px-2 py-1 border border-gray-300 dark:border-dark-border rounded-md text-sm text-right dark:bg-dark-bg dark:text-white focus:ring-2 focus:ring-orange-400"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                {editingItemIndex === index && itemEditDraft ? (
                                                                    <input
                                                                        type="text"
                                                                        value={itemEditDraft.ncm}
                                                                        onChange={(e) => setItemEditDraft({ ...itemEditDraft, ncm: e.target.value })}
                                                                        className="w-28 px-2 py-1 border border-gray-300 dark:border-dark-border rounded-md text-sm font-mono dark:bg-dark-bg dark:text-white"
                                                                    />
                                                                ) : (
                                                                <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">
                                                                    {item.ncm || '-'}
                                                                </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                {editingItemIndex === index && itemEditDraft ? (
                                                                    <input
                                                                        type="text"
                                                                        value={itemEditDraft.sku}
                                                                        onChange={(e) => setItemEditDraft({ ...itemEditDraft, sku: e.target.value })}
                                                                        className="w-28 px-2 py-1 border border-gray-300 dark:border-dark-border rounded-md text-sm font-mono dark:bg-dark-bg dark:text-white"
                                                                    />
                                                                ) : (
                                                                <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">
                                                                    {item.sku || '-'}
                                                                </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className="font-bold text-orange-700 dark:text-orange-400 text-base">
                                                                    R$ {(item.totalCost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                            {temClassificacaoDestino && (
                                                                <td className="px-4 py-4 text-center">
                                                                    <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.destinoEstoque === false}
                                                                            onChange={(e) => {
                                                                                setPurchaseItems((prev) =>
                                                                                    prev.map((row, i) =>
                                                                                        i === index
                                                                                            ? {
                                                                                                  ...row,
                                                                                                  destinoEstoque: !e.target.checked,
                                                                                              }
                                                                                            : row,
                                                                                    ),
                                                                                );
                                                                            }}
                                                                        />
                                                                        <span>
                                                                            {destinoTipo === 'PROJETO' ? 'OS' : 'Obra'}
                                                                        </span>
                                                                    </label>
                                                                </td>
                                                            )}
                                                            <td className="px-4 py-4 text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    {/* Ver Detalhes do Material */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedMaterialItem({
                                                                                nomeProduto: item.productName,
                                                                                nome: itemExtended.materialVinculado?.nome,
                                                                                sku: item.sku ?? itemExtended.materialVinculado?.sku,
                                                                                ncm: item.ncm ?? itemExtended.materialVinculado?.ncm,
                                                                                quantidade: item.quantity,
                                                                                valorUnit: item.unitCost,
                                                                                preco: itemExtended.materialVinculado?.preco,
                                                                                valorVenda: itemExtended.materialVinculado?.valorVenda,
                                                                                material: itemExtended.materialVinculado ?? null,
                                                                                fornecedor: undefined
                                                                            });
                                                                            setIsMaterialDetailsModalOpen(true);
                                                                        }}
                                                                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                                        title="Ver detalhes do material"
                                                                    >
                                                                        <EyeIcon className="w-4 h-4" />
                                                                    </button>
                                                                    
                                                                    {/* Botão de busca */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (mostraBusca) {
                                                                                setBuscaMaterialPorItem(prev => {
                                                                                    const novo = { ...prev };
                                                                                    delete novo[index];
                                                                                    return novo;
                                                                                });
                                                                            } else {
                                                                                setBuscaMaterialPorItem(prev => ({ ...prev, [index]: '' }));
                                                                            }
                                                                        }}
                                                                        className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                                                        title="Buscar material do estoque"
                                                                    >
                                                                        <MagnifyingGlassIcon className="w-4 h-4" />
                                                                    </button>
                                                                    
                                                                    {/* Botão para converter unidade (ex: km -> m) */}
                                                                    {(item.unidadeMedida || '').toLowerCase() === 'km' ||
                                                                    (item.unidadeMedida || '').toLowerCase() === 'm' ||
                                                                    (item.unidadeMedida || '').toLowerCase() === 'cm' ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setItemUnidadeEditando({
                                                                                    index,
                                                                                    productName: item.productName,
                                                                                    quantity: item.quantity,
                                                                                    unitCost: item.unitCost,
                                                                                    totalCost: item.totalCost,
                                                                                    unidadeMedida: item.unidadeMedida
                                                                                });
                                                                                const currentUnit = (item.unidadeMedida || 'm').toLowerCase() as 'km' | 'm' | 'cm';
                                                                                setTargetUnit(currentUnit === 'km' ? 'm' : currentUnit);
                                                                                setUnitConversionModalOpen(true);
                                                                            }}
                                                                            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-semibold"
                                                                            title="Converter unidade (ex: km → m, m → cm)"
                                                                        >
                                                                            ⇄
                                                                        </button>
                                                                    ) : null}
                                                                    
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setItemFracionamentoEditando({
                                                                                id: (item as any).id,
                                                                                productName: item.productName || '',
                                                                                quantity: item.quantity || 0,
                                                                                quantidadeFracionada: (item as any).quantidadeFracionada,
                                                                                tipoEmbalagem: (item as any).tipoEmbalagem,
                                                                                unidadeEmbalagem: (item as any).unidadeEmbalagem
                                                                            });
                                                                            setFracionamentoModalOpen(true);
                                                                        }}
                                                                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-semibold"
                                                                        title="Editar fracionamento"
                                                                    >
                                                                        📦
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (editingItemIndex === index) {
                                                                                salvarEdicaoItemLinha();
                                                                            } else {
                                                                                iniciarEdicaoItemLinha(index);
                                                                                setProductToAdd({
                                                                                    name: item.productName,
                                                                                    quantity: String(item.quantity),
                                                                                    cost: String(item.unitCost),
                                                                                    ncm: item.ncm || '',
                                                                                    sku: item.sku || '',
                                                                                    unidadeMedida: item.unidadeMedida || 'un'
                                                                                });
                                                                            }
                                                                        }}
                                                                        className={`p-1.5 rounded-lg transition-colors ${
                                                                            editingItemIndex === index
                                                                                ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                                                : 'text-amber-600 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                                                        }`}
                                                                        title={editingItemIndex === index ? 'Confirmar edição na linha' : 'Editar item na linha'}
                                                                    >
                                                                        {editingItemIndex === index ? (
                                                                            <CheckIcon className="w-4 h-4" />
                                                                        ) : (
                                                                            <PencilIcon className="w-4 h-4" />
                                                                        )}
                                                                    </button>
                                                                    {editingItemIndex === index && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={limparFormularioAdicao}
                                                                            className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                                                            title="Cancelar edição"
                                                                        >
                                                                            <XMarkIcon className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveProduct(index)}
                                                                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                        title="Remover item"
                                                                    >
                                                                        <TrashIcon className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        
                                                        {/* Linha expandida para busca de material */}
                                                        {mostraBusca && (
                                                            <tr>
                                                                <td colSpan={7} className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-dark-border">
                                                                    <div className="space-y-3">
                                                                        <div className="relative">
                                                                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                                            <input
                                                                                type="text"
                                                                                value={buscaMaterialPorItem[index] ?? ''}
                                                                                onChange={(e) => setBuscaMaterialPorItem(prev => ({ ...prev, [index]: e.target.value }))}
                                                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white text-sm"
                                                                                placeholder="Buscar material do estoque por nome ou SKU..."
                                                                                autoFocus
                                                                            />
                                                                        </div>
                                                                        
                                                                        {/* Lista de resultados da busca */}
                                                                        {materiaisFiltradosItem.length > 0 && (
                                                                            <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg">
                                                                                {materiaisFiltradosItem.map(material => (
                                                                                    <button
                                                                                        key={material.id}
                                                                                        type="button"
                                                                                        onClick={() => vincularMaterialAItem(index, material)}
                                                                                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                                                                                    >
                                                                                        <p className="font-medium text-sm text-gray-900 dark:text-white">{material.nome}</p>
                                                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                                            SKU: {material.sku} • Estoque: {material.estoque} {material.unidadeMedida}
                                                                                        </p>
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        
                                                                        {/* Opção para remover vinculação */}
                                                                        {itemExtended.materialId && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => removerVinculacaoMaterial(index)}
                                                                                className="text-xs text-red-600 hover:text-red-800 underline"
                                                                            >
                                                                                Remover vinculação
                                                                            </button>
                                                                        )}
                                                                        {!itemExtended.materialId && !itemExtended.criarNovoMaterial && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => marcarItemComoNovo(index)}
                                                                                className="text-xs text-blue-700 hover:text-blue-900 underline"
                                                                            >
                                                                                Este item ainda não existe no estoque (criar novo)
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                                </tbody>
                                            </table>
                                        </div>
                                        
                                        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 p-4 rounded-xl">
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-semibold text-gray-800">Total Geral:</span>
                                                <span className="text-2xl font-bold text-orange-700">
                                                    R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Custos e Pagamento */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Custos e Pagamento</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Valor do Frete</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={frete}
                                            onChange={(e) => setFrete(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            placeholder="0,00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Outras despesas</label>
                                        <p className="text-xs text-gray-500 mb-1">Somam ao total</p>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={outrasDespesas}
                                            onChange={(e) => setOutrasDespesas(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            placeholder="0,00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Descontos</label>
                                        <p className="text-xs text-gray-500 mb-1">Reduzem o valor dos produtos</p>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={descontos}
                                            onChange={(e) => setDescontos(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            placeholder="0,00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Valor IPI</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={valorIPI}
                                            onChange={(e) => setValorIPI(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            placeholder="0,00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Total produtos (automático)</label>
                                        <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 font-semibold">
                                            R$ {totalProdutosCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Soma dos itens</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Condição de Pagamento</label>
                                        <select
                                            value={condicaoPagamento}
                                            onChange={(e) => setCondicaoPagamento(e.target.value as any)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                        >
                                            <option value="AVISTA">À vista</option>
                                            <option value="PARCELADO">Parcelado</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Método de Pagamento</label>
                                        <select
                                            value={meioPagamento}
                                            onChange={(e) => {
                                                setMeioPagamento(e.target.value);
                                                if (e.target.value !== 'CARTAO_CREDITO') setCartaoCreditoId('');
                                            }}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                        >
                                            <option value="PIX">PIX</option>
                                            <option value="DINHEIRO">Cédulas</option>
                                            <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                                            <option value="CARTAO_DEBITO">Cartão de Débito</option>
                                            <option value="BOLETO">Boleto</option>
                                            <option value="TRANSFERENCIA">Transferência</option>
                                        </select>
                                    </div>
                                    {meioPagamento === 'CARTAO_CREDITO' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Cartão de Crédito *</label>
                                            <select
                                                value={cartaoCreditoId}
                                                onChange={(e) => setCartaoCreditoId(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            >
                                                <option value="">Selecione o cartão...</option>
                                                {cartoesCredito.map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.nomeOuBanco} ({c.bandeira}) •••• {c.ultimosQuatroDigitos}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Status da Compra *
                                        </label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value as PurchaseStatus)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 font-semibold"
                                        >
                                            <option value={PurchaseStatus.Pendente}>⏳ Pendente</option>
                                            <option value={PurchaseStatus.Recebido}>✅ Recebido (Entrada no Estoque)</option>
                                            <option value={PurchaseStatus.Cancelado}>❌ Cancelado</option>
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            ⚠️ Somente compras com status "Recebido" atualizam o estoque
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Parcialmento (Duplicatas) */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Faturas / Parcelas (Duplicatas)</h3>
                                <div className="space-y-3">
                                    {parcelas.length === 0 && (
                                        <p className="text-sm text-gray-500">Nenhuma parcela adicionada.</p>
                                    )}
                                    {parcelas.map((p, i) => (
                                        <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 border border-gray-200 p-3 rounded-xl">
                                            <input
                                                type="text"
                                                value={p.numero}
                                                onChange={(e) => setParcelas(prev => prev.map((px, idx) => idx === i ? { ...px, numero: e.target.value } : px))}
                                                className="px-3 py-2 border border-gray-300 rounded-lg"
                                                placeholder="Número"
                                            />
                                            <input
                                                type="date"
                                                value={p.dataVencimento}
                                                onChange={(e) => setParcelas(prev => prev.map((px, idx) => idx === i ? { ...px, dataVencimento: e.target.value } : px))}
                                                className="px-3 py-2 border border-gray-300 rounded-lg"
                                            />
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={p.valor}
                                                onChange={(e) => setParcelas(prev => prev.map((px, idx) => idx === i ? { ...px, valor: parseFloat(e.target.value || '0') } : px))}
                                                className="px-3 py-2 border border-gray-300 rounded-lg"
                                                placeholder="Valor"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setParcelas(prev => prev.filter((_, idx) => idx !== i))}
                                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-semibold"
                                            >
                                                Remover
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setParcelas(prev => [...prev, { numero: String(prev.length + 1).padStart(3, '0'), dataVencimento: '', valor: 0 }])}
                                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold"
                                    >
                                        Adicionar Parcela
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Observações</h3>
                                <p className="text-sm text-gray-500 mb-3">
                                    Visíveis nos detalhes da compra; podem ser alteradas depois pelo mesmo modal ou em &quot;Ver detalhes&quot;.
                                </p>
                                <textarea
                                    value={observacoesCompra}
                                    onChange={(e) => setObservacoesCompra(e.target.value)}
                                    rows={4}
                                    maxLength={8000}
                                    placeholder="Ex.: condições combinadas com o fornecedor, referência de pedido, etc."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 resize-y min-h-[100px]"
                                />
                            </div>

                            {/* Resumo de Totais */}
                            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 p-4 rounded-xl">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                                    <div className="text-sm text-gray-700">
                                        <div className="font-semibold">Produtos (itens)</div>
                                        <div>R$ {totalProdutosCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                    <div className="text-sm text-gray-700">
                                        <div className="font-semibold">Descontos</div>
                                        <div className="text-red-700">− R$ {Math.min(parseFloat(descontos || '0') || 0, totalProdutosCalculado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                    <div className="text-sm text-gray-700">
                                        <div className="font-semibold">IPI</div>
                                        <div>R$ {parseFloat(valorIPI || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                    <div className="text-sm text-gray-700">
                                        <div className="font-semibold">Frete</div>
                                        <div>R$ {parseFloat(frete || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                    <div className="text-sm text-gray-700">
                                        <div className="font-semibold">Outras despesas</div>
                                        <div>R$ {parseFloat(outrasDespesas || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                    <div className="text-right sm:col-span-2 lg:col-span-1">
                                        <div className="text-lg font-semibold text-gray-800">TOTAL GERAL DA NOTA</div>
                                        <div className="text-2xl font-bold text-orange-700">R$ {valorTotalNotaCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
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
                                    className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-medium font-semibold"
                                >
                                    {purchaseToEdit ? 'Atualizar' : 'Registrar'} Compra
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE IMPORTAÇÃO XML */}
            {isXMLModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-strong max-w-2xl w-full">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Importar XML da NF-e</h3>
                                <p className="text-sm text-gray-600 mt-1">Faça upload do arquivo XML para importar automaticamente</p>
                            </div>
                            <button onClick={() => setIsXMLModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-xl">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Arquivo XML da NF-e
                                </label>
                                <input
                                    type="file"
                                    accept=".xml"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setSelectedXMLFile(file);
                                            // opcional: processar imediatamente
                                            // handleXMLUpload(file);
                                        }
                                    }}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Selecione o arquivo XML da Nota Fiscal Eletrônica
                                </p>
                            </div>

                            {xmlError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <p className="text-red-800 font-medium">❌ {xmlError}</p>
                                </div>
                            )}

                            {parsedXMLData && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                    <h4 className="font-semibold text-green-900 mb-2">✅ XML processado com sucesso!</h4>
                                    <div className="text-sm text-green-800 space-y-1">
                                        <p><strong>Fornecedor:</strong> {parsedXMLData.vendor.name}</p>
                                        <p><strong>NF:</strong> {parsedXMLData.invoice.number}</p>
                                        <p><strong>Data:</strong> {new Date(parsedXMLData.invoice.emissionDate).toLocaleDateString('pt-BR')}</p>
                                        <p><strong>Itens:</strong> {parsedXMLData.items.length} produto(s)</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setIsXMLModalOpen(false)}
                                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => selectedXMLFile && handleXMLUpload(selectedXMLFile)}
                                    disabled={!selectedXMLFile || isProcessingXML}
                                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessingXML ? 'Processando...' : 'Processar e Preencher'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE VISUALIZAÇÃO */}
            {purchaseToView && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-7xl w-full max-h-[95vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-orange-600 to-orange-700">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Detalhes da Compra</h2>
                                <p className="text-sm text-orange-100 mt-1">Visualização completa do pedido</p>
                            </div>
                            <button onClick={() => setPurchaseToView(null)} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Informações Básicas */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">📋</span>
                                    Informações Básicas
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Fornecedor</h4>
                                        <p className="text-gray-900 font-medium">{purchaseToView.supplierName}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Status</h4>
                                        <span className={`inline-block px-3 py-1.5 text-xs font-bold rounded-lg ${getStatusClass(purchaseToView.status)}`}>
                                            {purchaseToView.status === PurchaseStatus.Pendente && '⏳ '}
                                            {purchaseToView.status === PurchaseStatus.Recebido && '✅ '}
                                            {purchaseToView.status === PurchaseStatus.Cancelado && '❌ '}
                                            {purchaseToView.status}
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Nota Fiscal</h4>
                                        <p className="text-gray-900 font-medium">
                                            {purchaseToView.invoiceNumber}
                                            {(purchaseToView as any).serieNF && (
                                                <span className="text-gray-500 ml-2">Série {(purchaseToView as any).serieNF}</span>
                                            )}
                                        </p>
                                    </div>
                                    {(purchaseToView as any).serieNF && (
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Série da NF</h4>
                                            <p className="text-gray-900 font-medium">{(purchaseToView as any).serieNF}</p>
                                        </div>
                                    )}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Data da Compra</h4>
                                        <p className="text-gray-900 font-medium">
                                            {(() => {
                                                const dataStr = purchaseToView.orderDate || (purchaseToView as any).dataCompra || (purchaseToView as any).data;
                                                if (!dataStr) return '—';
                                                if (typeof dataStr === 'string' && dataStr.includes('T')) {
                                                    const [dataPart] = dataStr.split('T');
                                                    const [ano, mes, dia] = dataPart.split('-');
                                                    return `${dia}/${mes}/${ano}`;
                                                }
                                                const d = new Date(dataStr);
                                                if (isNaN(d.getTime())) return '—';
                                                const dia = String(d.getUTCDate()).padStart(2, '0');
                                                const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
                                                const ano = d.getUTCFullYear();
                                                return `${dia}/${mes}/${ano}`;
                                            })()}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Data de Emissão da NF</h4>
                                        <p className="text-gray-900 font-medium">
                                            {(() => {
                                                const dataStr = (purchaseToView as any).dataEmissaoNF;
                                                if (!dataStr) return '—';
                                                if (typeof dataStr === 'string' && dataStr.includes('T')) {
                                                    const [dataPart] = dataStr.split('T');
                                                    const [ano, mes, dia] = dataPart.split('-');
                                                    return `${dia}/${mes}/${ano}`;
                                                }
                                                const d = new Date(dataStr);
                                                if (isNaN(d.getTime())) return '—';
                                                const dia = String(d.getUTCDate()).padStart(2, '0');
                                                const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
                                                const ano = d.getUTCFullYear();
                                                return `${dia}/${mes}/${ano}`;
                                            })()}
                                        </p>
                                    </div>
                                    <div
                                        className={`p-4 rounded-xl border ${
                                            (purchaseToView as any).dataRecebimento
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-gray-50 border-gray-200'
                                        }`}
                                    >
                                        <h4
                                            className={`text-xs font-semibold uppercase mb-1 flex items-center gap-1 ${
                                                (purchaseToView as any).dataRecebimento
                                                    ? 'text-green-600'
                                                    : 'text-gray-500'
                                            }`}
                                        >
                                            <span>✅</span> Data de Recebimento
                                        </h4>
                                        <p
                                            className={
                                                (purchaseToView as any).dataRecebimento
                                                    ? 'text-green-900 font-bold'
                                                    : 'text-gray-600 font-medium'
                                            }
                                        >
                                            {(purchaseToView as any).dataRecebimento
                                                ? (() => {
                                                    // ✅ CORREÇÃO: Formatar data sem problemas de timezone
                                                    const dataStr = (purchaseToView as any).dataRecebimento;
                                                    if (!dataStr) return 'Ainda não recebida';
                                                    
                                                    // Se for string ISO, extrair apenas a data (YYYY-MM-DD)
                                                    if (typeof dataStr === 'string' && dataStr.includes('T')) {
                                                        const [dataPart] = dataStr.split('T');
                                                        const [ano, mes, dia] = dataPart.split('-');
                                                        return `${dia}/${mes}/${ano}`;
                                                    }
                                                    
                                                    // Se for Date object ou outra string, tentar parsear
                                                    const data = new Date(dataStr);
                                                    if (isNaN(data.getTime())) return 'Data inválida';
                                                    
                                                    // Usar UTC para evitar problemas de timezone
                                                    const dia = String(data.getUTCDate()).padStart(2, '0');
                                                    const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
                                                    const ano = data.getUTCFullYear();
                                                    return `${dia}/${mes}/${ano}`;
                                                })()
                                                : 'Ainda não recebida'}
                                        </p>
                                    </div>
                                    {(purchaseToView as any).destinatarioCNPJ && (
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">CNPJ Destinatário</h4>
                                            <p className="text-gray-900 font-medium">{(purchaseToView as any).destinatarioCNPJ}</p>
                                        </div>
                                    )}
                                    {/* Empresa Compradora - sempre visível para identificar qual CNPJ efetuou a compra */}
                                    <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
                                        <h4 className="text-xs font-semibold text-blue-700 uppercase mb-1 flex items-center gap-1">
                                            🏢 Empresa que comprou
                                        </h4>
                                        {(purchaseToView as any).empresaCompradoraNome || (purchaseToView as any).empresaCompradoraCNPJ ? (
                                            <>
                                                {(purchaseToView as any).empresaCompradoraNome && (
                                                    <p className="text-blue-900 font-bold text-base">{(purchaseToView as any).empresaCompradoraNome}</p>
                                                )}
                                                {(purchaseToView as any).empresaCompradoraCNPJ && (
                                                    <p className="text-blue-700 font-medium text-sm mt-1">CNPJ: {(purchaseToView as any).empresaCompradoraCNPJ}</p>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-blue-600/80 text-sm">Não informada</p>
                                        )}
                                    </div>
                                    {(purchaseToView as any).statusImportacao && (
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Tipo de Importação</h4>
                                            <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-lg ${
                                                (purchaseToView as any).statusImportacao === 'XML' 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-gray-200 text-gray-700'
                                            }`}>
                                                {(purchaseToView as any).statusImportacao === 'XML' ? '📄 XML' : '✏️ Manual'}
                                            </span>
                                        </div>
                                    )}
                                    {(purchaseToView as any).obra && (
                                        <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-200">
                                            <h4 className="text-xs font-semibold text-purple-700 uppercase mb-1 flex items-center gap-1">
                                                🏗️ Obra Vinculada
                                            </h4>
                                            <p className="text-purple-900 font-bold">{(purchaseToView as any).obra?.nomeObra || ''}</p>
                                            <p className="text-xs text-purple-600 mt-1">Status: {(purchaseToView as any).obra?.status || ''}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Itens da Compra */}
                            {purchaseToView.items && purchaseToView.items.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">📦</span>
                                        Itens da Compra ({purchaseToView.items.length})
                                    </h3>
                                    <div className="border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-dark-border">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Produto</th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Qtd</th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Unidade</th>
                                                        <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Valor Unit.</th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">NCM</th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">SKU</th>
                                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Subtotal</th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
                                                    {purchaseToView.items.map((item, index) => {
                                                        const materialVinculado = (item as any).materialVinculado || (item as any).material;
                                                        const imagemUrl = materialVinculado?.imagemUrl;
                                                        
                                                        return (
                                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    {/* Imagem do produto */}
                                                                    {imagemUrl ? (
                                                                        <img 
                                                                            src={imagemUrl} 
                                                                            alt={item.productName}
                                                                            className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-dark-border"
                                                                            onError={(e) => {
                                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-dark-border flex items-center justify-center">
                                                                            <span className="text-gray-400 dark:text-gray-500 text-2xl">📦</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex-1">
                                                                        <p className="font-semibold text-gray-900 dark:text-dark-text text-sm">{item.productName}</p>
                                                                        {(item as any).quantidadeFracionada && item.quantity && (
                                                                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                                                📦 {item.quantity} {(item as any).tipoEmbalagem?.toLowerCase() || 'embalagens'} = {item.quantity * (item as any).quantidadeFracionada} unidades
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className="text-gray-700 dark:text-dark-text font-medium">
                                                                    {item.quantity}
                                                                    {(item as any).quantidadeFracionada && (
                                                                        <span className="text-blue-600 dark:text-blue-400 ml-1">
                                                                            ({(item as any).tipoEmbalagem?.toLowerCase() || 'embalagens'})
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">
                                                                    {(item as any).unidadeMedida || 'un'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-right">
                                                                <span className="text-gray-700 dark:text-dark-text font-medium">
                                                                    R$ {(item.unitCost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">
                                                                    {(item as any).material?.ncm || (item as any).ncm || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">
                                                                    {(item as any).material?.sku || (item as any).sku || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className="font-bold text-orange-700 dark:text-orange-400 text-base">
                                                                    R$ {(item.totalCost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <div className="flex flex-col items-center gap-2">
                                                                    {/* Badge de vinculação */}
                                                                    {(item as any).materialId && (item as any).material ? (
                                                                        // Item vinculado a material existente (pode ser match automático ou manual)
                                                                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-semibold whitespace-nowrap">
                                                                            ✅ Vinculado
                                                                        </span>
                                                                    ) : (item as any).matchAutomatico && (item as any).materialVinculado ? (
                                                                        // Match automático (apenas durante criação, antes de salvar)
                                                                        <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded text-xs font-semibold whitespace-nowrap">
                                                                            ⚠️ Match automático
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded text-xs font-semibold whitespace-nowrap">
                                                                            ⚠️ Sem vínculo
                                                                        </span>
                                                                    )}
                                                                    
                                                                    {/* Botões de ação */}
                                                                    <div className="flex items-center gap-2">
                                                                        {/* Ver Detalhes do Material */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setSelectedMaterialItem({
                                                                                    nomeProduto: item.productName,
                                                                                    nome: (item as any).material?.nome,
                                                                                    sku: (item as any).material?.sku ?? (item as any).sku,
                                                                                    ncm: (item as any).material?.ncm ?? (item as any).ncm,
                                                                                    quantidade: item.quantity,
                                                                                    valorUnit: item.unitCost,
                                                                                    preco: (item as any).material?.preco,
                                                                                    valorVenda: (item as any).material?.valorVenda,
                                                                                    material: (item as any).material ?? null,
                                                                                    fornecedor: (purchaseToView as any).fornecedor ?? undefined
                                                                                });
                                                                                setIsMaterialDetailsModalOpen(true);
                                                                            }}
                                                                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                                            title="Ver detalhes do material"
                                                                        >
                                                                            <EyeIcon className="w-4 h-4" />
                                                                        </button>
                                                                        
                                                                        {/* Botão de editar fracionamento */}
                                                                        <button
                                                                            onClick={() => {
                                                                                setItemFracionamentoEditando({
                                                                                    id: (item as any).id,
                                                                                    productName: item.productName || '',
                                                                                    quantity: item.quantity || 0,
                                                                                    quantidadeFracionada: (item as any).quantidadeFracionada,
                                                                                    tipoEmbalagem: (item as any).tipoEmbalagem,
                                                                                    unidadeEmbalagem: (item as any).unidadeEmbalagem
                                                                                });
                                                                                setFracionamentoModalOpen(true);
                                                                            }}
                                                                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-semibold"
                                                                            title="Editar fracionamento"
                                                                        >
                                                                            📦
                                                                        </button>
                                                                    </div>
                                                                </div>
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

                            {/* Detalhes Fiscais e Totais */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600">💰</span>
                                    Detalhes Fiscais e Totais
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {(purchaseToView as any).valorTotalProdutos !== undefined && (
                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                                            <h4 className="text-xs font-semibold text-blue-700 uppercase mb-1">Total Produtos</h4>
                                            <p className="text-xl font-bold text-blue-900">
                                                R$ {parseFloat((purchaseToView as any).valorTotalProdutos || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    )}
                                    {(purchaseToView as any).frete !== undefined && parseFloat((purchaseToView as any).frete || '0') > 0 && (
                                        <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
                                            <h4 className="text-xs font-semibold text-purple-700 uppercase mb-1">Frete</h4>
                                            <p className="text-xl font-bold text-purple-900">
                                                R$ {parseFloat((purchaseToView as any).frete || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    )}
                                    {(purchaseToView as any).valorIPI !== undefined && parseFloat((purchaseToView as any).valorIPI || '0') > 0 && (
                                        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
                                            <h4 className="text-xs font-semibold text-indigo-700 uppercase mb-1">Valor IPI</h4>
                                            <p className="text-xl font-bold text-indigo-900">
                                                R$ {parseFloat((purchaseToView as any).valorIPI || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    )}
                                    {(purchaseToView as any).outrasDespesas !== undefined && parseFloat((purchaseToView as any).outrasDespesas || '0') > 0 && (
                                        <div className="bg-gray-100 border border-gray-300 p-4 rounded-xl">
                                            <h4 className="text-xs font-semibold text-gray-700 uppercase mb-1">Outras Despesas</h4>
                                            <p className="text-xl font-bold text-gray-900">
                                                R$ {parseFloat((purchaseToView as any).outrasDespesas || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    )}
                                    {(purchaseToView as any).valorDesconto !== undefined && parseFloat((purchaseToView as any).valorDesconto || '0') > 0 && (
                                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                                            <h4 className="text-xs font-semibold text-red-700 uppercase mb-1">Descontos</h4>
                                            <p className="text-xl font-bold text-red-900">
                                                − R$ {parseFloat((purchaseToView as any).valorDesconto || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Total Geral */}
                                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 p-6 rounded-xl mt-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="text-sm font-semibold text-orange-700 uppercase mb-1">Total Geral da Nota</h4>
                                            <p className="text-xs text-gray-600">
                                                {(purchaseToView as any).valorTotalNota !== undefined 
                                                    ? 'Valor total da NF-e' 
                                                    : 'Valor total da compra'}
                                            </p>
                                        </div>
                                        <p className="text-4xl font-bold text-orange-700">
                                            R$ {(
                                                (purchaseToView as any).valorTotalNota !== undefined 
                                                    ? parseFloat((purchaseToView as any).valorTotalNota || '0') 
                                                    : (purchaseToView.totalAmount ?? 0)
                                            ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Condições de Pagamento e Duplicatas */}
                            {((purchaseToView as any).condicoesPagamento || 
                              (purchaseToView as any).duplicatas?.length > 0 || 
                              (purchaseToView as any).contasPagar?.length > 0) && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">💳</span>
                                        Condições de Pagamento e Parcelas
                                    </h3>
                                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            {(purchaseToView as any).condicoesPagamento && (
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Condição</h4>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {(purchaseToView as any).condicoesPagamento === 'AVISTA' ? '💵 À Vista' : '📅 Parcelado'}
                                                    </p>
                                                </div>
                                            )}
                                            {(purchaseToView as any).parcelas && (
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Parcelas</h4>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {(purchaseToView as any).parcelas}x
                                                    </p>
                                                </div>
                                            )}
                                            {(purchaseToView as any).dataPrimeiroVencimento && (
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Primeiro Vencimento</h4>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {new Date((purchaseToView as any).dataPrimeiroVencimento).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Duplicatas */}
                                        {((purchaseToView as any).duplicatas && (purchaseToView as any).duplicatas.length > 0) && (
                                            <div className="mt-4">
                                                <h4 className="text-sm font-semibold text-gray-700 mb-3">📋 Duplicatas/Parcelas do Boleto</h4>
                                                <div className="space-y-2">
                                                    {(purchaseToView as any).duplicatas.map((dup: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200 shadow-sm">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-8 h-8 rounded-full bg-green-500 text-white text-sm font-bold flex items-center justify-center shadow-md">
                                                                    {idx + 1}
                                                                </span>
                                                                <div>
                                                                    <p className="text-xs font-semibold text-gray-600 uppercase">Duplicata {dup.numero || (idx + 1).toString().padStart(3, '0')}</p>
                                                                    <p className="text-sm font-medium text-gray-900 mt-1">
                                                                        📅 Vencimento: {formatDateBR(dup.dataVencimento)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-lg font-bold text-green-700">
                                                                    R$ {parseFloat(dup.valor || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Contas a Pagar Vinculadas */}
                            {(purchaseToView as any).contasPagar && (purchaseToView as any).contasPagar.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">💳</span>
                                        Contas a Pagar Vinculadas ({(purchaseToView as any).contasPagar.length})
                                    </h3>
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-purple-50 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Parcela</th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Vencimento</th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Agendamento</th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Pagamento</th>
                                                        <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Valor</th>
                                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {(purchaseToView as any).contasPagar.map((conta: any, idx: number) => (
                                                        <tr key={conta.id || idx} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <span className="font-semibold text-gray-900">
                                                                    {conta.numeroParcela || idx + 1}/{conta.totalParcelas || (purchaseToView as any).contasPagar.length}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className="text-sm text-gray-700">
                                                                    {formatDateBR(conta.dataVencimento)}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                {conta.dataAgendamento ? (
                                                                    <span className="text-sm text-blue-600 font-medium">
                                                                        📅 {formatDateBR(conta.dataAgendamento)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                {conta.dataPagamento ? (
                                                                    <span className="text-sm text-green-600 font-medium">
                                                                        ✅ {formatDateBR(conta.dataPagamento)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4 text-right">
                                                                <span className="font-bold text-gray-900">
                                                                    R$ {parseFloat(conta.valorParcela || conta.valor || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`inline-block px-3 py-1.5 text-xs font-bold rounded-lg ${
                                                                    conta.status === 'Pago' ? 'bg-green-100 text-green-800' :
                                                                    conta.status === 'Atrasado' ? 'bg-red-100 text-red-800' :
                                                                    conta.dataAgendamento ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                    {conta.status === 'Pago' && '✅ '}
                                                                    {conta.status === 'Atrasado' && '⚠️ '}
                                                                    {conta.status === 'Pendente' && conta.dataAgendamento && '📅 '}
                                                                    {conta.status === 'Pendente' && !conta.dataAgendamento && '⏳ '}
                                                                    {conta.status || 'Pendente'}
                                                                </span>
                                                            </td>
                                                                    <td className="px-4 py-4 text-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                try {
                                                                                    localStorage.setItem('s3e_initial_financeiro_aba', 'pagar');
                                                                                    localStorage.setItem('s3e_initial_conta_pagar_id', conta.id);
                                                                                } catch (err) {
                                                                                    // ignore
                                                                                }
                                                                                window.dispatchEvent(new CustomEvent('s3e-open-conta-pagar', { detail: { contaId: conta.id } }));
                                                                                navigate('/');
                                                                            }}
                                                                            className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-semibold"
                                                                        >
                                                                            Ver / Pagar
                                                                        </button>
                                                                    </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Observações (edição rápida; mesmo dado do formulário / API) */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">📝</span>
                                    Observações
                                </h3>
                                <p className="text-sm text-gray-500 mb-3">
                                    Texto livre sobre esta compra. Altere abaixo e clique em salvar; também é possível editar em &quot;Editar compra&quot;.
                                </p>
                                <textarea
                                    value={observacoesDetalheDraft}
                                    onChange={(e) => setObservacoesDetalheDraft(e.target.value)}
                                    rows={5}
                                    maxLength={8000}
                                    placeholder="Nenhuma observação ainda. Digite aqui e salve."
                                    className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-800 resize-y min-h-[120px] bg-white"
                                />
                                <div className="mt-3 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={salvarObservacoesDetalhe}
                                        disabled={salvandoObservacoes}
                                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {salvandoObservacoes ? 'Salvando…' : 'Salvar observações'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Rodapé com Ações */}
                        <div className="p-6 bg-gray-50 border-t border-gray-200">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                {/* Status Atual */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${
                                            purchaseToView.status === PurchaseStatus.Recebido ? 'bg-green-500' :
                                            purchaseToView.status === PurchaseStatus.Pendente ? 'bg-yellow-500' :
                                            'bg-red-500'
                                        }`}></div>
                                        <span className="text-sm font-medium text-gray-700">
                                            Status: <strong>{purchaseToView.status}</strong>
                                        </span>
                                    </div>
                                    {(purchaseToView as any).dataRecebimento && (
                                        <div className="text-sm text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                                            📅 Recebido em: {(() => {
                                                const dataStr = (purchaseToView as any).dataRecebimento;
                                                if (!dataStr) return 'N/A';
                                                
                                                // ✅ CORREÇÃO: Formatar data sem problemas de timezone
                                                if (typeof dataStr === 'string' && dataStr.includes('T')) {
                                                    const [dataPart] = dataStr.split('T');
                                                    const [ano, mes, dia] = dataPart.split('-');
                                                    return `${dia}/${mes}/${ano}`;
                                                }
                                                
                                                const data = new Date(dataStr);
                                                if (isNaN(data.getTime())) return 'Data inválida';
                                                
                                                // Usar UTC para evitar problemas de timezone
                                                const dia = String(data.getUTCDate()).padStart(2, '0');
                                                const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
                                                const ano = data.getUTCFullYear();
                                                return `${dia}/${mes}/${ano}`;
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* Botões de Ação */}
                                <div className="flex gap-3">
                                    {purchaseToView.status === PurchaseStatus.Pendente && !isCompraDespesasVariadas(purchaseToView) && (
                                        <button
                                            onClick={handleOpenReceivingModal}
                                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Receber Remessa
                                        </button>
                                    )}
                                    {purchaseToView.status === PurchaseStatus.Recebido && (
                                        <div className="flex items-center gap-2 px-6 py-3 bg-green-100 text-green-800 rounded-xl font-semibold">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {isCompraDespesasVariadas(purchaseToView)
                                                ? 'Despesa registrada (sem remessa de estoque)'
                                                : 'Remessa Recebida'}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setPurchaseToView(null)}
                                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE RECEBIMENTO DE REMESSA */}
            {isReceivingModalOpen && purchaseToView && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden border border-gray-200 max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="p-6 bg-gradient-to-r from-green-600 to-green-700">
                            <div className="flex items-center gap-3 text-white">
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Confirmar Recebimento</h3>
                                    <p className="text-sm text-green-100">NF #{purchaseToView.invoiceNumber}</p>
                                </div>
                            </div>
                        </div>

                        {/* Conteúdo */}
                        <div className="p-8 space-y-6">
                            {/* Informações da Compra */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                                <h4 className="text-base font-semibold text-blue-900 mb-4">Resumo da Compra</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-gray-600 mb-1">Fornecedor:</span>
                                        <span className="font-semibold text-gray-900 text-base">{purchaseToView.supplierName}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-600 mb-1">Total de Itens:</span>
                                        <span className="font-semibold text-gray-900 text-base">{purchaseToView.items.length} produtos</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-600 mb-1">Valor Total:</span>
                                        <span className="font-bold text-xl text-green-700">
                                            R$ {(purchaseToView.totalAmount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Lista de Itens para Marcar */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                    📦 Itens da Compra - Marque os recebidos
                                </h4>
                                <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50">
                                    {purchaseToView.items.map((item: any, index) => {
                                        // ✅ CRÍTICO: SEMPRE usar item.id (ID único do CompraItem do banco)
                                        // Se não houver ID, é um erro de mapeamento - não usar fallback
                                        if (!item.id) {
                                            console.error('❌ Item sem ID!', item);
                                        }
                                        const itemId = item.id; // Sem fallback - o ID deve vir do backend
                                        
                                        return (
                                            <label
                                                key={itemId}
                                                className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={itensRecebidos[itemId] || false}
                                                    onChange={(e) => {
                                                        setItensRecebidos(prev => ({
                                                            ...prev,
                                                            [itemId]: e.target.checked
                                                        }));
                                                    }}
                                                    className="mt-1 w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-900 text-base">{item.productName}</p>
                                                    <div className="flex gap-6 mt-2 text-sm text-gray-600">
                                                        <span className="font-medium">Qtd: <span className="text-gray-900">{item.quantity} {(item as any).unidadeMedida || 'un'}</span></span>
                                                        <span className="font-medium">Valor Unit.: <span className="text-gray-900">R$ {item.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
                                                        <span className="font-medium">Total: <span className="text-green-700 font-bold">R$ {(item.quantity * item.unitCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
                                                    </div>
                                                </div>
                                        </label>
                                        );
                                    })}
                                </div>
                                <div className="mt-2 flex justify-between text-xs">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const todosTrue: {[key: string]: boolean} = {};
                                            purchaseToView.items.forEach((item: any) => {
                                                // ✅ CRÍTICO: Sempre usar item.id (sem fallback)
                                                if (item.id) {
                                                    todosTrue[item.id] = true;
                                                }
                                            });
                                            console.log(`✓ Marcando todos os ${Object.keys(todosTrue).length} itens`, todosTrue);
                                            setItensRecebidos(todosTrue);
                                        }}
                                        className="text-green-600 hover:text-green-700 font-semibold"
                                    >
                                        ✓ Marcar Todos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            console.log('✗ Desmarcando todos os itens');
                                            setItensRecebidos({});
                                        }}
                                        className="text-red-600 hover:text-red-700 font-semibold"
                                    >
                                        ✗ Desmarcar Todos
                                    </button>
                                </div>
                            </div>

                            {/* Data de Recebimento */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Data de Recebimento *
                                </label>
                                <input
                                    type="date"
                                    value={dataRecebimento}
                                    onChange={(e) => setDataRecebimento(e.target.value)}
                                    max={(() => {
                                        const hoje = new Date();
                                        const ano = hoje.getFullYear();
                                        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
                                        const dia = String(hoje.getDate()).padStart(2, '0');
                                        return `${ano}-${mes}-${dia}`;
                                    })()}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    📅 Data em que a mercadoria foi recebida fisicamente
                                </p>
                            </div>

                            {/* Alerta de Impacto */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                <div className="flex gap-3">
                                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-semibold text-yellow-800 mb-1">⚠️ Atenção</p>
                                        <p className="text-xs text-yellow-700">
                                            Apenas os itens marcados serão adicionados ao estoque. Itens não marcados permanecem pendentes.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Rodapé com Botões */}
                        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setIsReceivingModalOpen(false)}
                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReceberRemessa}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Confirmar Recebimento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AlertDialog de Confirmação de Exclusão */}
            <AlertDialog
                isOpen={showDeleteDialog}
                onClose={() => {
                    setShowDeleteDialog(false);
                    setPurchaseToDelete(null);
                }}
                onConfirm={handleDeleteCompra}
                title={`Excluir compra #${purchaseToDelete?.invoiceNumber || purchaseToDelete?.id.slice(0, 8) || 'N/A'}?`}
                message={`Tem certeza que deseja excluir permanentemente esta compra? Esta ação não pode ser desfeita.`}
                confirmText="Excluir Permanentemente"
                cancelText="Cancelar"
                variant="danger"
            />

            {/* Modal de Editar Fracionamento */}
            <EditarFracionamentoModal
                isOpen={fracionamentoModalOpen}
                onClose={() => {
                    setFracionamentoModalOpen(false);
                    setItemFracionamentoEditando(null);
                }}
                item={itemFracionamentoEditando}
                onSave={(fracionamento) => {
                    if (itemFracionamentoEditando && purchaseToView) {
                        // Atualizar o item na lista de itens da compra visualizada
                        const updatedItems = purchaseToView.items.map((item: any) => {
                            if (item.id === itemFracionamentoEditando.id || 
                                (item.productName === itemFracionamentoEditando.productName && 
                                 item.quantity === itemFracionamentoEditando.quantity)) {
                                return {
                                    ...item,
                                    quantidadeFracionada: fracionamento.quantidadeFracionada,
                                    tipoEmbalagem: fracionamento.tipoEmbalagem,
                                    unidadeEmbalagem: fracionamento.unidadeEmbalagem
                                };
                            }
                            return item;
                        });
                        setPurchaseToView({ ...purchaseToView, items: updatedItems });
                        toast.success('Fracionamento atualizado!');
                    } else if (itemFracionamentoEditando) {
                        // Atualizar item na lista de itens da compra sendo editada
                        const updatedItems = purchaseItems.map((item: any) => {
                            if (item.id === itemFracionamentoEditando.id || 
                                (item.productName === itemFracionamentoEditando.productName && 
                                 item.quantity === itemFracionamentoEditando.quantity)) {
                                return {
                                    ...item,
                                    quantidadeFracionada: fracionamento.quantidadeFracionada,
                                    tipoEmbalagem: fracionamento.tipoEmbalagem,
                                    unidadeEmbalagem: fracionamento.unidadeEmbalagem
                                };
                            }
                            return item;
                        });
                        setPurchaseItems(updatedItems);
                        toast.success('Fracionamento atualizado!');
                    }
                }}
            />

            {/* Modal de Conversão de Unidade (ex: km -> m) */}
            {unitConversionModalOpen && itemUnidadeEditando && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Converter unidade do item
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Use este recurso para converter cabos/fios de km para metros (ou outras combinações), mantendo o valor total da nota.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setUnitConversionModalOpen(false);
                                    setItemUnidadeEditando(null);
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {(() => {
                            const currentUnit = (itemUnidadeEditando.unidadeMedida || 'un').toLowerCase();
                            const quantity = itemUnidadeEditando.quantity ?? 0;
                            const unitCost = itemUnidadeEditando.unitCost ?? 0;
                            const totalCost =
                                itemUnidadeEditando.totalCost ??
                                (quantity || 0) * (unitCost || 0);

                            const unitToMeters: Record<string, number> = {
                                km: 1000,
                                m: 1,
                                cm: 0.01
                            };

                            const currentFactor = unitToMeters[currentUnit] ?? 1;
                            const targetFactor = unitToMeters[targetUnit] ?? 1;

                            const baseInMeters = quantity * currentFactor;
                            const newQuantity =
                                targetFactor > 0 ? baseInMeters / targetFactor : quantity;

                            const pricePerMeter =
                                baseInMeters > 0 ? totalCost / baseInMeters : 0;
                            const newUnitCost =
                                pricePerMeter * (targetFactor || 1);

                            return (
                                <div className="p-6 space-y-5">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                            Item selecionado
                                        </p>
                                        <p className="text-sm text-gray-700 dark:text-gray-200">
                                            {itemUnidadeEditando.productName || 'Item sem nome'}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-3 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg">
                                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                                Situação atual
                                            </p>
                                            <p className="text-sm text-gray-800 dark:text-gray-100">
                                                Quantidade:{' '}
                                                <span className="font-semibold">
                                                    {quantity.toLocaleString('pt-BR', {
                                                        minimumFractionDigits: 3,
                                                        maximumFractionDigits: 3
                                                    })}{' '}
                                                    {currentUnit}
                                                </span>
                                            </p>
                                            <p className="text-sm text-gray-800 dark:text-gray-100">
                                                Valor unitário:{' '}
                                                <span className="font-semibold">
                                                    R${' '}
                                                    {unitCost.toLocaleString('pt-BR', {
                                                        minimumFractionDigits: 4,
                                                        maximumFractionDigits: 4
                                                    })}{' '}
                                                    / {currentUnit}
                                                </span>
                                            </p>
                                            <p className="text-sm text-gray-800 dark:text-gray-100">
                                                Total do item:{' '}
                                                <span className="font-semibold text-orange-600 dark:text-orange-400">
                                                    R${' '}
                                                    {totalCost.toLocaleString('pt-BR', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })}
                                                </span>
                                            </p>
                                        </div>

                                        <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
                                            <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">
                                                Conversão proposta
                                            </p>
                                            <div className="mb-2">
                                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                                    Unidade desejada
                                                </label>
                                                <select
                                                    value={targetUnit}
                                                    onChange={(e) =>
                                                        setTargetUnit(
                                                            e.target.value as 'km' | 'm' | 'cm'
                                                        )
                                                    }
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 dark:bg-dark-bg dark:text-white"
                                                >
                                                    <option value="km">km (quilômetro)</option>
                                                    <option value="m">m (metro)</option>
                                                    <option value="cm">cm (centímetro)</option>
                                                </select>
                                            </div>

                                            <p className="text-sm text-gray-800 dark:text-gray-100">
                                                Nova quantidade:{' '}
                                                <span className="font-semibold">
                                                    {newQuantity.toLocaleString('pt-BR', {
                                                        minimumFractionDigits: 3,
                                                        maximumFractionDigits: 3
                                                    })}{' '}
                                                    {targetUnit}
                                                </span>
                                            </p>
                                            <p className="text-sm text-gray-800 dark:text-gray-100">
                                                Novo valor unitário:{' '}
                                                <span className="font-semibold">
                                                    R${' '}
                                                    {newUnitCost.toLocaleString('pt-BR', {
                                                        minimumFractionDigits: 4,
                                                        maximumFractionDigits: 4
                                                    })}{' '}
                                                    / {targetUnit}
                                                </span>
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                O valor total do item permanece o mesmo. Apenas a
                                                unidade e a granularidade serão ajustadas.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            Dica: use principalmente para cabos/fios que vieram em
                                            km na nota fiscal, mas serão controlados em metros ou
                                            centímetros no estoque.
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setUnitConversionModalOpen(false);
                                                    setItemUnidadeEditando(null);
                                                }}
                                                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPurchaseItems((prev) =>
                                                        prev.map((item, idx) => {
                                                            if (
                                                                idx !==
                                                                (itemUnidadeEditando.index ?? -1)
                                                            ) {
                                                                return item;
                                                            }

                                                            return {
                                                                ...item,
                                                                quantity: newQuantity,
                                                                unitCost: newUnitCost,
                                                                totalCost,
                                                                unidadeMedida: targetUnit
                                                            };
                                                        })
                                                    );

                                                    toast.success(
                                                        `Unidade convertida para ${targetUnit} com sucesso!`
                                                    );

                                                    setUnitConversionModalOpen(false);
                                                    setItemUnidadeEditando(null);
                                                }}
                                                className="px-5 py-2 text-sm font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                            >
                                                Aplicar conversão
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Modal de detalhes do material (compra avulsa / visualização de compra) */}
            <MaterialDetailsModal
                open={isMaterialDetailsModalOpen}
                onClose={() => { setIsMaterialDetailsModalOpen(false); setSelectedMaterialItem(null); }}
                item={selectedMaterialItem}
            />
        </div>
    );
};

export default Compras;