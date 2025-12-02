import React, { useState, useMemo, useRef, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { type PurchaseOrder, type Supplier, PurchaseStatus, type PurchaseOrderItem, type Product, CatalogItemType } from '../types';
import { parseNFeXML, readFileAsText } from '../utils/xmlParser';
import { comprasService } from '../services/comprasService';
import ViewToggle from './ui/ViewToggle';
import { loadViewMode, saveViewMode } from '../utils/viewModeStorage';
import { AuthContext } from '../contexts/AuthContext';
import { canDelete } from '../utils/permissions';
import AlertDialog from './ui/AlertDialog';
import { useEscapeKey } from '../hooks/useEscapeKey';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(loadViewMode('Compras'));
    
    // Salvar viewMode no localStorage quando mudar
    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        saveViewMode('Compras', mode);
    };
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isXMLModalOpen, setIsXMLModalOpen] = useState(false);

    // Action states
    const [purchaseToView, setPurchaseToView] = useState<PurchaseOrder | null>(null);
    const [purchaseToEdit, setPurchaseToEdit] = useState<PurchaseOrder | null>(null);
    const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseOrder | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    
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
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [status, setStatus] = useState<PurchaseStatus>(PurchaseStatus.Pendente);
    type ExtendedItem = PurchaseOrderItem & { ncm?: string; sku?: string };
    const [purchaseItems, setPurchaseItems] = useState<ExtendedItem[]>([]);
    const [productToAdd, setProductToAdd] = useState<{id: string, quantity: string, cost: string, ncm?: string, sku?: string}>({id: '', quantity: '1', cost: ''});
    
    // Novos campos do fornecedor
    const [supplierName, setSupplierName] = useState('');
    const [supplierCNPJ, setSupplierCNPJ] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [supplierEmail, setSupplierEmail] = useState('');
    const [supplierAddress, setSupplierAddress] = useState('');

    // XML Import states
    const [selectedXMLFile, setSelectedXMLFile] = useState<File | null>(null);
    const [parsedXMLData, setParsedXMLData] = useState<ParsedXMLData | null>(null);
    const [isProcessingXML, setIsProcessingXML] = useState(false);
    const [xmlError, setXmlError] = useState<string | null>(null);

    // Campos de custos e pagamento
    const [frete, setFrete] = useState<string>('0');
    const [outrasDespesas, setOutrasDespesas] = useState<string>('0');
    const [condicaoPagamento, setCondicaoPagamento] = useState<'AVISTA' | 'PARCELADO'>('AVISTA');
    const [numParcelas, setNumParcelas] = useState<string>('1');
    const [dataPrimeiroVencimento, setDataPrimeiroVencimento] = useState<string>('');

    // Campos fiscais/ERP adicionais
    const [destinatarioCNPJ, setDestinatarioCNPJ] = useState<string>('');
    const [statusImportacao, setStatusImportacao] = useState<'MANUAL' | 'XML'>('MANUAL');
    const [valorIPI, setValorIPI] = useState<string>('0');
    const [valorTotalProdutos, setValorTotalProdutos] = useState<string>('0');
    const [valorTotalNota, setValorTotalNota] = useState<string>('0');
    // Duplicatas/Parcelas
    const [duplicatas, setDuplicatas] = useState<Array<{numero: string, dataVencimento: string, valor: number}>>([]);
    const [parcelas, setParcelas] = useState<Array<{ numero: string; dataVencimento: string; valor: number }>>([]);

    const totalProdutosCalculado = useMemo(() => {
        return purchaseItems.reduce((total, item) => total + (item.totalCost ?? 0), 0);
    }, [purchaseItems]);

    const valorTotalNotaCalculado = useMemo(() => {
        const freteNum = parseFloat(frete || '0') || 0;
        const outrasNum = parseFloat(outrasDespesas || '0') || 0;
        const ipiNum = parseFloat(valorIPI || '0') || 0;
        const totalProdutosNum = parseFloat(valorTotalProdutos || String(totalProdutosCalculado)) || 0;
        return totalProdutosNum + ipiNum + freteNum + outrasNum;
    }, [valorIPI, frete, outrasDespesas, valorTotalProdutos, totalProdutosCalculado]);

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

    const filteredPurchases = useMemo(() => {
        let filtered = purchaseOrders;
        
        if (filter !== 'Todos') {
            filtered = filtered.filter(purchase => purchase.status === filter);
        }
        
        if (searchTerm) {
            filtered = filtered.filter(purchase => {
                const supplierName = (purchase.supplierName || '').toLowerCase();
                const invoice = (purchase.invoiceNumber || '').toLowerCase();
                const term = searchTerm.toLowerCase();
                return supplierName.includes(term) || invoice.includes(term);
            });
        }
        
        return filtered;
    }, [filter, searchTerm, purchaseOrders]);

    // Handlers
    const handleOpenModal = (purchase: PurchaseOrder | null = null) => {
        if (purchase) {
            setPurchaseToEdit(purchase);
            setSelectedSupplierId(purchase.supplierId || '');
            setPurchaseDate(purchase.orderDate || new Date().toISOString().split('T')[0]);
            setInvoiceNumber(purchase.invoiceNumber || '');
            setStatus(purchase.status);
            setPurchaseItems(purchase.items);
            setSupplierName(purchase.supplierName || '');
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setPurchaseToEdit(null);
        setSelectedSupplierId('');
        setPurchaseDate(new Date().toISOString().split('T')[0]);
        setInvoiceNumber('');
        setStatus(PurchaseStatus.Pendente);
        setPurchaseItems([]);
        setSupplierName('');
        setSupplierCNPJ('');
        setSupplierPhone('');
        setSupplierEmail('');
        setSupplierAddress('');
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


    // Fechar modais com ESC
    useEscapeKey(isModalOpen, handleCloseModal);
    useEscapeKey(isXMLModalOpen, () => setIsXMLModalOpen(false));
    useEscapeKey(isReceivingModalOpen, () => {
        setIsReceivingModalOpen(false);
        setPurchaseToView(null);
    });
    useEscapeKey(!!purchaseToView, () => setPurchaseToView(null));
    useEscapeKey(!!purchaseToDelete, () => setPurchaseToDelete(null));

    const handleAddProduct = () => {
        if (!productToAdd.id || !productToAdd.quantity || !productToAdd.cost) {
            toast.error('Preencha todos os campos do produto');
            return;
        }

        const product = products.find(p => p.id === productToAdd.id);
        if (!product) return;

        const quantity = parseFloat(productToAdd.quantity);
        const unitCost = parseFloat(productToAdd.cost);
        const totalCost = quantity * unitCost;

        const newItem: ExtendedItem = {
            productId: product.id,
            productName: product.name,
            quantity,
            unitCost,
            totalCost,
            ncm: productToAdd.ncm,
            sku: productToAdd.sku
        };

        setPurchaseItems(prev => [...prev, newItem]);
        setProductToAdd({id: '', quantity: '1', cost: ''});
    };

    const handleRemoveProduct = (index: number) => {
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

        try {
            // Se está editando, apenas atualizar o status
            if (purchaseToEdit) {
                console.log('✏️ Atualizando status da compra:', purchaseToEdit.id, 'para', status);
                await comprasService.updateCompraStatus(purchaseToEdit.id, status);
                
                // reload list
                const data = await comprasService.getCompras();
                setPurchaseOrders(data);

                toast.error('✅ Status da compra atualizado com sucesso!');
                handleCloseModal();
                return;
            }

            // Se não está editando, criar nova compra
            const payload: any = {
                fornecedorNome: supplierName,
                fornecedorCNPJ: supplierCNPJ,
                fornecedorTel: supplierPhone,
                numeroNF: invoiceNumber,
                dataEmissaoNF: purchaseDate,
                dataCompra: purchaseDate,
                status: status,
                valorFrete: parseFloat(frete || '0') || 0,
                outrasDespesas: parseFloat(outrasDespesas || '0') || 0,
                items: purchaseItems.map((it) => ({
                    nomeProduto: it.productName,
                    quantidade: it.quantity,
                    valorUnit: it.unitCost,
                    ncm: (it as any).ncm,
                    sku: (it as any).sku
                })),
                observacoes: '',
                condicoesPagamento: condicaoPagamento === 'PARCELADO' ? 'PARCELADO' : 'AVISTA',
                parcelas: condicaoPagamento === 'PARCELADO' ? parseInt(numParcelas || '1') : 1,
                dataPrimeiroVencimento: condicaoPagamento === 'PARCELADO' && dataPrimeiroVencimento ? dataPrimeiroVencimento : undefined,
                destinatarioCNPJ,
                statusImportacao,
                valorIPI: parseFloat(valorIPI || '0') || 0,
                valorTotalProdutos: parseFloat(valorTotalProdutos || '0') || 0,
                valorTotalNota: valorTotalNotaCalculado,
                duplicatas
            };

            console.log('📤 Criando nova compra:', payload);
            await comprasService.createCompra(payload);

            // reload list
            const data = await comprasService.getCompras();
            setPurchaseOrders(data);

            toast.error('✅ Compra registrada com sucesso!');
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
    const handleXMLUpload = async (file: File | null | undefined) => {
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
            
            console.log('📅 Data Emissão:', data.dataEmissao);
            setPurchaseDate(data.dataEmissao ? String(data.dataEmissao).slice(0, 10) : new Date().toISOString().split('T')[0]);
            
            console.log('📦 Items do XML:', data.items);
            setPurchaseItems(
                (data.items || []).map((it: any) => ({
                    productId: it.materialId || '',
                    productName: it.nomeProduto || '',
                    quantity: it.quantidade || 0,
                    unitCost: it.valorUnit || 0,
                    totalCost: (it.quantidade || 0) * (it.valorUnit || 0),
                    ncm: it.ncm || '',
                    sku: it.sku || ''
                }))
            );

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
            setValorIPI(String(data.valorIPI ?? '0'));
            setValorTotalProdutos(String(data.valorTotalProdutos ?? '0'));
            setValorTotalNota(String(data.valorTotalNota ?? '0'));

            // Destinatário
            setDestinatarioCNPJ(data.destinatarioCNPJ || '');
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

            // Abrir modal de compra preenchido
            console.log('✅ XML processado com sucesso! Abrindo modal de compra...');
            console.log('📝 Estados populados:');
            console.log('  - Fornecedor:', data.fornecedor?.nome || '❌ VAZIO');
            console.log('  - CNPJ:', data.fornecedor?.cnpj || '❌ VAZIO');
            console.log('  - NF:', data.numeroNF || '❌ VAZIO');
            console.log('  - Items:', (data.items || []).length, 'itens');
            
            setIsXMLModalOpen(false);
            setTimeout(() => {
                setIsModalOpen(true);
                console.log('🎯 Modal de compra aberto!');
                
                toast.success('XML importado com sucesso!', {
                    description: `${(data.items || []).length} itens carregados. Revise e salve a compra.`,
                    duration: 4000
                });
            }, 100);
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
                description: `Compra #${purchaseToDelete.invoiceNumber || purchaseToDelete.id.slice(0, 8)} foi excluída permanentemente`
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

    return (
        <div className="min-h-screen p-4 sm:p-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 rounded-xl hover:bg-white hover:shadow-soft">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">Compras</h1>
                        <p className="text-sm sm:text-base text-gray-500 mt-1">Gerencie pedidos de compra e fornecedores</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsXMLModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                    >
                        <DocumentArrowUpIcon className="w-5 h-5" />
                        Importar XML
                    </button>
                    <button
                        onClick={() => navigate('/compras/nova')}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-medium font-semibold"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Nova Compra
                    </button>
                </div>
            </header>

            {/* Filtros */}
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                </div>

                <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm text-gray-600">
                        Exibindo <span className="font-bold text-gray-900">{filteredPurchases.length}</span> de <span className="font-bold text-gray-900">{purchaseOrders.length}</span> compras
                    </p>
                    <div className="flex items-center gap-4">
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
                    {filteredPurchases.map((purchase) => (
                        <div key={purchase.id} className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium hover:border-orange-300 transition-all duration-200">
                            {/* Header do Card */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-900 mb-1">{purchase.supplierName}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 text-xs font-bold rounded-lg bg-orange-100 text-orange-800 ring-1 ring-orange-200">
                                            🛒 Compra
                                        </span>
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
                                    onClick={() => setPurchaseToView(purchase)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                >
                                    <EyeIcon className="w-4 h-4" />
                                    Ver Detalhes
                                </button>
                                {purchase.status === PurchaseStatus.Pendente && (
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
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
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
                                {filteredPurchases.map((purchase) => (
                                    <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
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
                                                    onClick={() => setPurchaseToView(purchase)}
                                                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
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
                                                {purchase.status === PurchaseStatus.Pendente && (
                                                    <button
                                                        onClick={() => {
                                                            setPurchaseToView(purchase);
                                                            handleOpenReceivingModal();
                                                        }}
                                                        className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-semibold"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </button>
                                                )}
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
                    <div className="bg-white rounded-2xl shadow-strong max-w-7xl w-full max-h-[95vh] overflow-y-auto animate-slide-in-up">
                        {/* Header */}
                        <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-orange-600 to-orange-700">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-medium">
                                    {purchaseToEdit ? <PencilIcon className="w-7 h-7 text-white" /> : <PlusIcon className="w-7 h-7 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-white">
                                        {purchaseToEdit ? 'Editar Compra' : 'Nova Compra'}
                                    </h2>
                                    <p className="text-sm text-white/80 mt-1">
                                        {purchaseToEdit ? 'Atualize as informações da compra' : 'Registre uma nova compra ou pedido'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-xl"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Informações do Fornecedor */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações do Fornecedor</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Nome do Fornecedor *
                                        </label>
                                        <input
                                            type="text"
                                            value={supplierName}
                                            onChange={(e) => setSupplierName(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            placeholder="Nome da empresa fornecedora"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            CNPJ
                                        </label>
                                        <input
                                            type="text"
                                            value={supplierCNPJ}
                                            onChange={(e) => setSupplierCNPJ(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            placeholder="00.000.000/0000-00"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Telefone
                                        </label>
                                        <input
                                            type="text"
                                            value={supplierPhone}
                                            onChange={(e) => setSupplierPhone(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            placeholder="(00) 0000-0000"
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
                                            value={destinatarioCNPJ}
                                            onChange={(e) => setDestinatarioCNPJ(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            placeholder="00.000.000/0000-00"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
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
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Valor IPI</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={valorIPI}
                                            onChange={(e) => setValorIPI(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Total Produtos</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={valorTotalProdutos}
                                            onChange={(e) => setValorTotalProdutos(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Total da Nota</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={valorTotalNota}
                                            onChange={(e) => setValorTotalNota(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                </div>
                                
                            </div>

                            {/* Itens da Compra */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Itens da Compra</h3>
                                
                                {/* Adicionar Produto */}
                                <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-4">
                                    <h4 className="font-medium text-gray-800 mb-3">Adicionar Item</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                        <div>
                                            <input
                                                type="text"
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
                                                value={productToAdd.ncm || ''}
                                                onChange={(e) => setProductToAdd({...productToAdd, ncm: e.target.value})}
                                                placeholder="NCM"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={productToAdd.sku || ''}
                                                onChange={(e) => setProductToAdd({...productToAdd, sku: e.target.value})}
                                                placeholder="SKU (opcional)"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>
                                        <div>
                                            <button
                                                type="button"
                                                onClick={handleAddProduct}
                                                className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all font-semibold"
                                            >
                                                Adicionar
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Lista de Itens */}
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
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
                                                    {purchaseItems.map((item, index) => (
                                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <p className="font-semibold text-gray-900 dark:text-dark-text text-sm">{item.productName}</p>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className="text-gray-700 dark:text-dark-text font-medium">{item.quantity}</span>
                                                            </td>
                                                            <td className="px-4 py-4 text-right">
                                                                <span className="text-gray-700 dark:text-dark-text font-medium">
                                                                    R$ {(item.unitCost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">
                                                                    {item.ncm || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">
                                                                    {item.sku || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className="font-bold text-orange-700 dark:text-orange-400 text-base">
                                                                    R$ {(item.totalCost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveProduct(index)}
                                                                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                    title="Remover item"
                                                                >
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
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
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
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
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Outras Despesas/Descontos</label>
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
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Total Produtos</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={valorTotalProdutos || String(totalProdutosCalculado)}
                                            onChange={(e) => setValorTotalProdutos(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                        />
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
                                    {condicaoPagamento === 'PARCELADO' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Número de Parcelas</label>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={numParcelas}
                                                onChange={(e) => setNumParcelas(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>
                                    )}
                                </div>
                                {condicaoPagamento === 'PARCELADO' && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Data do 1º Vencimento</label>
                                            <input
                                                type="date"
                                                value={dataPrimeiroVencimento}
                                                onChange={(e) => setDataPrimeiroVencimento(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>
                                    </div>
                                )}
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

                            {/* Resumo de Totais */}
                            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 p-4 rounded-xl">
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div className="text-sm text-gray-700">
                                        <div className="font-semibold">Produtos</div>
                                        <div>R$ {(valorTotalProdutos ? parseFloat(valorTotalProdutos) : totalProdutosCalculado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
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
                                        <div className="font-semibold">Outras Despesas</div>
                                        <div>R$ {parseFloat(outrasDespesas || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                    <div className="text-right">
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
                                        <p className="text-gray-900 font-medium">{purchaseToView.invoiceNumber}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Data da Compra</h4>
                                        <p className="text-gray-900 font-medium">
                                            {new Date(
                                                purchaseToView.orderDate ||
                                                (purchaseToView as any).data ||
                                                new Date().toISOString()
                                            ).toLocaleDateString('pt-BR')}
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
                                                        <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Valor Unit.</th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">NCM</th>
                                                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">SKU</th>
                                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
                                                    {purchaseToView.items.map((item, index) => (
                                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <p className="font-semibold text-gray-900 dark:text-dark-text text-sm">{item.productName}</p>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className="text-gray-700 dark:text-dark-text font-medium">{item.quantity}</span>
                                                            </td>
                                                            <td className="px-4 py-4 text-right">
                                                                <span className="text-gray-700 dark:text-dark-text font-medium">
                                                                    R$ {(item.unitCost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">
                                                                    {(item as any).ncm || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className="text-gray-600 dark:text-gray-400 font-mono text-sm">
                                                                    {(item as any).sku || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className="font-bold text-orange-700 dark:text-orange-400 text-base">
                                                                    R$ {(item.totalCost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
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

                            {/* Condições de Pagamento */}
                            {((purchaseToView as any).condicoesPagamento || (purchaseToView as any).duplicatas?.length > 0) && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">💳</span>
                                        Condições de Pagamento
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
                                        {(purchaseToView as any).duplicatas && (purchaseToView as any).duplicatas.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Duplicatas/Parcelas</h4>
                                                <div className="space-y-2">
                                                    {(purchaseToView as any).duplicatas.map((dup: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
                                                                    {idx + 1}
                                                                </span>
                                                                <div>
                                                                    <p className="text-xs text-gray-500">Duplicata {dup.numero || (idx + 1).toString().padStart(3, '0')}</p>
                                                                    <p className="text-sm font-medium text-gray-900">
                                                                        Vencimento: {new Date(dup.dataVencimento).toLocaleDateString('pt-BR')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <p className="text-lg font-bold text-green-700">
                                                                R$ {parseFloat(dup.valor || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Observações */}
                            {purchaseToView.notes && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">📝</span>
                                        Observações
                                    </h3>
                                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                                        <p className="text-gray-700">{purchaseToView.notes}</p>
                                    </div>
                                </div>
                            )}
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
                                    {purchaseToView.status === PurchaseStatus.Pendente && (
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
                                            Remessa Recebida
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
                                                        <span className="font-medium">Qtd: <span className="text-gray-900">{item.quantity}</span></span>
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
        </div>
    );
};

export default Compras;