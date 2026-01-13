import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { type PurchaseOrderItem, PurchaseStatus } from '../types';
import { comprasService } from '../services/comprasService';
import { readFileAsText } from '../utils/xmlParser';
import { matchCrossSearch } from '../utils/searchUtils';
import { axiosApiService } from '../services/axiosApi';
import EditarFracionamentoModal from '../components/EditarFracionamentoModal';

// ==================== ICONS ====================
const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

const DocumentArrowUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);

// Types
type ExtendedItem = PurchaseOrderItem & { 
    ncm?: string; 
    sku?: string; 
    unidadeMedida?: string;
    // Campos de fracionamento
    quantidadeFracionada?: number; // Quantidade de unidades por embalagem
    tipoEmbalagem?: string; // "CAIXA", "PACOTE", etc.
    unidadeEmbalagem?: string; // "cx", "pct", etc.
};

interface NovaCompraPageProps {
    toggleSidebar: () => void;
}

const NovaCompraPage: React.FC<NovaCompraPageProps> = ({ toggleSidebar }) => {
    const navigate = useNavigate();

    // Form state
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [status, setStatus] = useState<PurchaseStatus>(PurchaseStatus.Pendente);
    const [purchaseItems, setPurchaseItems] = useState<ExtendedItem[]>([]);
    const [productToAdd, setProductToAdd] = useState<{
        name: string;
        quantity: string;
        cost: string;
        ncm?: string;
        sku?: string;
        unidadeMedida?: string;
    }>({ name: '', quantity: '1', cost: '', unidadeMedida: 'un' });

    // Fornecedor
    const [supplierName, setSupplierName] = useState('');
    const [supplierCNPJ, setSupplierCNPJ] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [supplierEmail, setSupplierEmail] = useState('');
    const [supplierAddress, setSupplierAddress] = useState('');

    // Custos e pagamento
    const [frete, setFrete] = useState<string>('0');
    const [outrasDespesas, setOutrasDespesas] = useState<string>('0');
    const [condicaoPagamento, setCondicaoPagamento] = useState<'AVISTA' | 'PARCELADO'>('AVISTA');
    const [numParcelas, setNumParcelas] = useState<string>('1');
    const [dataPrimeiroVencimento, setDataPrimeiroVencimento] = useState<string>('');

    // Campos fiscais
    const [destinatarioCNPJ, setDestinatarioCNPJ] = useState<string>('');
    const [statusImportacao, setStatusImportacao] = useState<'MANUAL' | 'XML'>('MANUAL');
    const [valorIPI, setValorIPI] = useState<string>('0');
    const [valorTotalProdutos, setValorTotalProdutos] = useState<string>('0');
    const [valorTotalNota, setValorTotalNota] = useState<string>('0');

    // Parcelas
    const [parcelas, setParcelas] = useState<Array<{ numero: string; dataVencimento: string; valor: number }>>([]);

    // XML Import
    const [selectedXMLFile, setSelectedXMLFile] = useState<File | null>(null);
    const [isProcessingXML, setIsProcessingXML] = useState(false);
    const [xmlError, setXmlError] = useState<string | null>(null);
    const [showXMLImport, setShowXMLImport] = useState(false);

    // Busca de materiais do estoque
    const [materiais, setMateriais] = useState<any[]>([]);
    const [buscaMaterial, setBuscaMaterial] = useState('');
    const [showMaterialSearch, setShowMaterialSearch] = useState(false);
    const [materialSelecionado, setMaterialSelecionado] = useState<any | null>(null);
    const [isItemNovo, setIsItemNovo] = useState(false);
    
    // Estados de fracionamento
    const [fracionamentoAtivo, setFracionamentoAtivo] = useState(false);
    const [quantidadeFracionada, setQuantidadeFracionada] = useState<string>('');
    const [tipoEmbalagem, setTipoEmbalagem] = useState<string>('CAIXA');
    const [unidadeEmbalagem, setUnidadeEmbalagem] = useState<string>('cx');
    
    // Estados para editar fracionamento de itens
    const [fracionamentoModalOpen, setFracionamentoModalOpen] = useState(false);
    const [itemFracionamentoEditando, setItemFracionamentoEditando] = useState<{
        productName: string;
        quantity: number;
        quantidadeFracionada?: number;
        tipoEmbalagem?: string;
        unidadeEmbalagem?: string;
    } | null>(null);

    // Carregar materiais do estoque
    useEffect(() => {
        const carregarMateriais = async () => {
            try {
                const response = await axiosApiService.get('/api/materiais');
                const data = response.data || response;
                setMateriais(data);
            } catch (error) {
                console.error('Erro ao carregar materiais:', error);
            }
        };
        carregarMateriais();
    }, []);

    // Calculated values
    const totalProdutosCalculado = useMemo(() => {
        return purchaseItems.reduce((total, item) => total + item.totalCost, 0);
    }, [purchaseItems]);

    const valorTotalNotaCalculado = useMemo(() => {
        const freteNum = parseFloat(frete || '0') || 0;
        const outrasNum = parseFloat(outrasDespesas || '0') || 0;
        const ipiNum = parseFloat(valorIPI || '0') || 0;
        const totalProdutosNum = parseFloat(valorTotalProdutos || String(totalProdutosCalculado)) || 0;
        return totalProdutosNum + ipiNum + freteNum + outrasNum;
    }, [valorIPI, frete, outrasDespesas, valorTotalProdutos, totalProdutosCalculado]);

    // Filtrar materiais pela busca
    const materiaisFiltrados = useMemo(() => {
        if (!buscaMaterial) return [];
        return materiais.filter(m => 
            matchCrossSearch(buscaMaterial, m.nome) ||
            m.sku.toLowerCase().includes(buscaMaterial.toLowerCase()) ||
            (m.descricao && m.descricao.toLowerCase().includes(buscaMaterial.toLowerCase()))
        ).slice(0, 10); // Limitar a 10 resultados
    }, [buscaMaterial, materiais]);

    // Função para detectar fracionamento automaticamente pela descrição
    const detectarFracionamento = (nomeProduto: string) => {
        // Padrões: "PACOTE COM X UNIDADES", "CAIXA COM X UN", "X UNIDADES", etc.
        const padrao = /(?:PACOTE|CAIXA|FARDO|EMBALAGEM).*?(\d+)\s*(?:UNIDADES?|UN\.?|PCS?|PEÇAS?)/i;
        const match = nomeProduto.match(padrao);
        
        if (match && match[1]) {
            const quantidade = parseInt(match[1]);
            if (quantidade > 1) {
                setFracionamentoAtivo(true);
                setQuantidadeFracionada(String(quantidade));
                
                // Detectar tipo de embalagem
                if (nomeProduto.toUpperCase().includes('PACOTE')) {
                    setTipoEmbalagem('PACOTE');
                    setUnidadeEmbalagem('pct');
                } else if (nomeProduto.toUpperCase().includes('FARDO')) {
                    setTipoEmbalagem('FARDO');
                    setUnidadeEmbalagem('fardo');
                } else {
                    setTipoEmbalagem('CAIXA');
                    setUnidadeEmbalagem('cx');
                }
                
                return true;
            }
        }
        return false;
    };
    
    // Handlers
    const handleMarcarComoItemNovo = () => {
        setIsItemNovo(true);
        setMaterialSelecionado(null);
        setBuscaMaterial('');
        setShowMaterialSearch(false);
        toast.info('💡 Item marcado como NOVO - será criado do zero no estoque');
    };
    
    // Handler para quando o nome do produto muda (detecção automática)
    const handleNomeProdutoChange = (nome: string) => {
        setProductToAdd(prev => ({ ...prev, name: nome }));
        // Tentar detectar fracionamento automaticamente
        if (nome && !fracionamentoAtivo) {
            detectarFracionamento(nome);
        }
    };

    const handleAddProduct = () => {
        if (!productToAdd.name || !productToAdd.quantity || !productToAdd.cost) {
            toast.error('Preencha todos os campos do produto');
            return;
        }
        
        // Validar fracionamento se ativo
        if (fracionamentoAtivo && (!quantidadeFracionada || parseFloat(quantidadeFracionada) <= 0)) {
            toast.error('Informe a quantidade de unidades por embalagem');
            return;
        }

        const quantity = parseFloat(productToAdd.quantity);
        const unitCost = parseFloat(productToAdd.cost);
        const totalCost = quantity * unitCost;
        
        // Calcular quantidade total de unidades se fracionado
        const quantidadeTotalUnidades = fracionamentoAtivo && quantidadeFracionada
            ? quantity * parseFloat(quantidadeFracionada)
            : quantity;

        const newItem: ExtendedItem = {
            productId: materialSelecionado ? materialSelecionado.id : '',
            productName: productToAdd.name,
            quantity,
            unitCost,
            totalCost,
            ncm: productToAdd.ncm,
            sku: productToAdd.sku,
            unidadeMedida: productToAdd.unidadeMedida || (materialSelecionado?.unidadeMedida) || 'un',
            // Campos de fracionamento
            quantidadeFracionada: fracionamentoAtivo && quantidadeFracionada ? parseFloat(quantidadeFracionada) : undefined,
            tipoEmbalagem: fracionamentoAtivo ? tipoEmbalagem : undefined,
            unidadeEmbalagem: fracionamentoAtivo ? unidadeEmbalagem : undefined
        };

        setPurchaseItems(prev => [...prev, newItem]);
        
        // Limpar campos
        setProductToAdd({ name: '', quantity: '1', cost: '', ncm: '', sku: '', unidadeMedida: 'un' });
        setMaterialSelecionado(null);
        setBuscaMaterial('');
        setIsItemNovo(false);
        setFracionamentoAtivo(false);
        setQuantidadeFracionada('');
        setTipoEmbalagem('CAIXA');
        setUnidadeEmbalagem('cx');
        
        // Mensagem de sucesso com informações de fracionamento
        let mensagem = '';
        if (materialSelecionado) {
            mensagem = `✅ ${materialSelecionado.nome} adicionado e vinculado ao estoque`;
        } else if (isItemNovo) {
            mensagem = `✅ Item NOVO adicionado - será criado do zero no estoque após o recebimento`;
        } else {
            mensagem = `✅ Produto adicionado (será criado um novo item no estoque)`;
        }
        
        if (fracionamentoAtivo && quantidadeFracionada) {
            mensagem += `\n📦 ${quantity} ${tipoEmbalagem.toLowerCase()} = ${quantidadeTotalUnidades} unidades`;
        }
        
        toast.success(mensagem);
    };

    const handleRemoveProduct = (index: number) => {
        setPurchaseItems(prev => prev.filter((_, i) => i !== index));
    };

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

            const resp = await comprasService.parseXML(xmlContent);
            const data = (resp as any)?.data || (resp as any) || {};

            console.log('📦 Dados do XML parseado:', data);

            // Preencher Fornecedor
            if (data.fornecedor) {
                setSupplierName(data.fornecedor.nome || '');
                setSupplierCNPJ(data.fornecedor.cnpj || '');
                setSupplierAddress(data.fornecedor.endereco || '');
            }

            // Preencher Informações da Compra
            setInvoiceNumber(data.numeroNF || '');
            if (data.dataEmissao) {
                const dataEmissao = data.dataEmissao.split('T')[0];
                setPurchaseDate(dataEmissao);
            }

            // Preencher CNPJ Destinatário
            setDestinatarioCNPJ(data.destinatarioCNPJ || '');

            // Preencher Valores Fiscais
            setValorIPI(String(data.valorIPI || 0));
            setValorTotalProdutos(String(data.valorTotalProdutos || 0));
            setValorTotalNota(String(data.valorTotalNota || 0));
            setFrete(String(data.valorFrete || 0));
            setOutrasDespesas(String(data.outrasDespesas || 0));

            // Preencher Itens
            if (data.items && Array.isArray(data.items)) {
                const xmlItems: ExtendedItem[] = data.items.map((item: any) => ({
                    productId: '',
                    productName: item.nomeProduto || '',
                    quantity: item.quantidade || 0,
                    unitCost: item.valorUnit || 0,
                    totalCost: item.valorTotal || 0,
                    ncm: item.ncm || '',
                    sku: item.sku || '',
                    unidadeMedida: item.unidadeMedida || item.unidade || 'un'
                }));
                setPurchaseItems(xmlItems);
                console.log(`✅ ${xmlItems.length} itens adicionados ao formulário`);
            }

            // Preencher Parcelas
            if (data.parcelas && Array.isArray(data.parcelas) && data.parcelas.length > 0) {
                const xmlParcelas = data.parcelas.map((p: any) => ({
                    numero: p.numero || '',
                    dataVencimento: p.dataVencimento || '',
                    valor: p.valor || 0
                }));
                setParcelas(xmlParcelas);
                console.log(`✅ ${xmlParcelas.length} parcelas adicionadas`);
                
                if (xmlParcelas.length > 1) {
                    setCondicaoPagamento('PARCELADO');
                    setNumParcelas(String(xmlParcelas.length));
                    if (xmlParcelas[0].dataVencimento) {
                        setDataPrimeiroVencimento(xmlParcelas[0].dataVencimento);
                    }
                } else if (xmlParcelas.length === 1) {
                    setCondicaoPagamento('AVISTA');
                    if (xmlParcelas[0].dataVencimento) {
                        setDataPrimeiroVencimento(xmlParcelas[0].dataVencimento);
                    }
                }
            }

            setStatusImportacao('XML');
            setShowXMLImport(false);
            toast.success('✅ XML importado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao processar XML:', error);
            setXmlError('Erro ao processar arquivo XML: ' + (error as Error).message);
            toast.error('❌ Erro ao processar XML');
        } finally {
            setIsProcessingXML(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (purchaseItems.length === 0) {
            toast.error('Adicione pelo menos um item à compra');
            return;
        }

        try {
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
                    sku: (it as any).sku,
                    unidadeMedida: it.unidadeMedida || 'un',
                    // Campos de fracionamento
                    quantidadeFracionada: it.quantidadeFracionada,
                    tipoEmbalagem: it.tipoEmbalagem,
                    unidadeEmbalagem: it.unidadeEmbalagem
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
                duplicatas: parcelas
            };

            console.log('📤 Criando nova compra:', payload);
            await comprasService.createCompra(payload);

            toast.success('✅ Compra registrada com sucesso!');
            navigate('/compras'); // Volta para a página de compras
        } catch (error) {
            console.error('❌ Erro:', error);
            toast.error('❌ Erro ao processar compra');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
            {/* Header */}
            <div className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleSidebar}
                                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                            >
                                <Bars3Icon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                            </button>
                            <button
                                onClick={() => navigate('/compras')}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                            >
                                <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Nova Compra
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Registre uma nova compra ou pedido
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowXMLImport(!showXMLImport)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                        >
                            <DocumentArrowUpIcon className="w-5 h-5" />
                            Importar XML
                        </button>
                    </div>
                </div>
            </div>

            {/* XML Import Section */}
            {showXMLImport && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6 border border-gray-200 dark:border-dark-border">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Importar XML da NF-e</h3>
                        <div className="space-y-4">
                            <div>
                                <input
                                    type="file"
                                    accept=".xml"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setSelectedXMLFile(file);
                                        }
                                    }}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white"
                                />
                            </div>
                            {xmlError && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                                    <p className="text-red-800 dark:text-red-300 font-medium">❌ {xmlError}</p>
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowXMLImport(false)}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-all font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => selectedXMLFile && handleXMLUpload(selectedXMLFile)}
                                    disabled={!selectedXMLFile || isProcessingXML}
                                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessingXML ? 'Processando...' : 'Processar e Preencher'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                {/* Informações do Fornecedor */}
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6 border border-gray-200 dark:border-dark-border">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Informações do Fornecedor</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Nome do Fornecedor *
                            </label>
                            <input
                                type="text"
                                value={supplierName}
                                onChange={(e) => setSupplierName(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                placeholder="Nome da empresa fornecedora"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                CNPJ
                            </label>
                            <input
                                type="text"
                                value={supplierCNPJ}
                                onChange={(e) => setSupplierCNPJ(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                placeholder="00.000.000/0000-00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Telefone
                            </label>
                            <input
                                type="text"
                                value={supplierPhone}
                                onChange={(e) => setSupplierPhone(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                placeholder="(00) 0000-0000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={supplierEmail}
                                onChange={(e) => setSupplierEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                placeholder="contato@fornecedor.com"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Endereço
                            </label>
                            <input
                                type="text"
                                value={supplierAddress}
                                onChange={(e) => setSupplierAddress(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                placeholder="Endereço completo do fornecedor"
                            />
                        </div>
                    </div>
                </div>

                {/* Informações da Compra */}
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6 border border-gray-200 dark:border-dark-border">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Informações da Compra</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Número da NF *
                            </label>
                            <input
                                type="text"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                required
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                placeholder="NF-000123"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Data da Compra
                            </label>
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as PurchaseStatus)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                            >
                                <option value={PurchaseStatus.Pendente}>Pendente</option>
                                <option value={PurchaseStatus.Recebido}>Recebido</option>
                                <option value={PurchaseStatus.Cancelado}>Cancelado</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">CNPJ Destinatário</label>
                            <input
                                type="text"
                                value={destinatarioCNPJ}
                                onChange={(e) => setDestinatarioCNPJ(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                placeholder="00.000.000/0000-00"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status de Importação</label>
                            <select
                                value={statusImportacao}
                                onChange={(e) => setStatusImportacao(e.target.value as any)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                            >
                                <option value="MANUAL">Manual</option>
                                <option value="XML">XML</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Valor IPI</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={valorIPI}
                                onChange={(e) => setValorIPI(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Total Produtos</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={valorTotalProdutos}
                                onChange={(e) => setValorTotalProdutos(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Total da Nota</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={valorTotalNota}
                                onChange={(e) => setValorTotalNota(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Itens da Compra */}
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6 border border-gray-200 dark:border-dark-border">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Itens da Compra</h3>

                    {/* Adicionar Produto */}
                    <div className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border p-4 rounded-xl mb-4">
                        <h4 className="font-medium text-gray-800 dark:text-white mb-3">Adicionar Item</h4>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                            <div className="relative md:col-span-2">
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={materialSelecionado ? materialSelecionado.nome : buscaMaterial}
                                            onChange={(e) => {
                                                setBuscaMaterial(e.target.value);
                                                setMaterialSelecionado(null);
                                                setIsItemNovo(false);
                                                setShowMaterialSearch(true);
                                                handleNomeProdutoChange(e.target.value);
                                            }}
                                            onFocus={() => {
                                                if (!isItemNovo) {
                                                    setShowMaterialSearch(true);
                                                }
                                            }}
                                            placeholder={isItemNovo ? "✨ Digite o nome do item novo" : "🔍 Buscar no estoque ou digite novo"}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white ${
                                                isItemNovo 
                                                    ? 'border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20' 
                                                    : 'border-gray-300 dark:border-dark-border'
                                            }`}
                                        />
                                        {showMaterialSearch && materiaisFiltrados.length > 0 && !isItemNovo && (
                                            <div className="absolute z-50 left-0 mt-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-xl max-h-80 overflow-y-auto min-w-[600px] w-max max-w-[800px]">
                                                {materiaisFiltrados.map((material) => (
                                                    <button
                                                        key={material.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setMaterialSelecionado(material);
                                                            setBuscaMaterial(material.nome);
                                                            setIsItemNovo(false);
                                                            setProductToAdd({
                                                                ...productToAdd,
                                                                name: material.nome,
                                                                cost: String(material.preco || ''),
                                                                sku: material.sku || '',
                                                                unidadeMedida: material.unidadeMedida || 'un'
                                                            });
                                                            setShowMaterialSearch(false);
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-dark-hover transition-colors border-b border-gray-100 dark:border-dark-border last:border-b-0"
                                                    >
                                                        <div className="font-semibold text-gray-900 dark:text-white text-base mb-1.5 break-words">
                                                            {material.nome}
                                                        </div>
                                                        <div className="text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-4 items-center">
                                                            <span className="font-medium">SKU: <span className="font-normal">{material.sku}</span></span>
                                                            <span className="font-medium">Estoque: <span className="font-normal">{material.estoque} {material.unidadeMedida || 'un'}</span></span>
                                                            <span className="text-green-600 dark:text-green-400 font-semibold text-base ml-auto">
                                                                R$ {(material.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                        {material.descricao && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1.5 line-clamp-2">
                                                                {material.descricao}
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleMarcarComoItemNovo}
                                        className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                                            isItemNovo
                                                ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-medium'
                                                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/40 border border-purple-300 dark:border-purple-700'
                                        }`}
                                        title="Marcar como item novo - será criado do zero no estoque"
                                    >
                                        {isItemNovo ? '✨ Item Novo' : '✨ Item Novo'}
                                    </button>
                                </div>
                                {materialSelecionado && (
                                    <div className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        Produto do estoque vinculado
                                    </div>
                                )}
                                {isItemNovo && !materialSelecionado && (
                                    <div className="mt-1 text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                        </svg>
                                        Item NOVO - será criado do zero no estoque
                                    </div>
                                )}
                            </div>
                            <div>
                                <input
                                    type="number"
                                    value={productToAdd.quantity}
                                    onChange={(e) => setProductToAdd({ ...productToAdd, quantity: e.target.value })}
                                    placeholder="Quantidade"
                                    min="1"
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                />
                            </div>
                            <div>
                                <input
                                    type="number"
                                    value={productToAdd.cost}
                                    onChange={(e) => setProductToAdd({ ...productToAdd, cost: e.target.value })}
                                    placeholder="Valor unitário"
                                    min="0"
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    value={productToAdd.ncm || ''}
                                    onChange={(e) => setProductToAdd({ ...productToAdd, ncm: e.target.value })}
                                    placeholder="NCM"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    value={productToAdd.sku || ''}
                                    onChange={(e) => setProductToAdd({ ...productToAdd, sku: e.target.value })}
                                    placeholder="SKU (opcional)"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                />
                            </div>
                            <div>
                                <select
                                    value={productToAdd.unidadeMedida || 'un'}
                                    onChange={(e) => setProductToAdd({ ...productToAdd, unidadeMedida: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                >
                                    <option value="un">Unidade (un)</option>
                                    <option value="m">Metro (m)</option>
                                    <option value="cm">Centímetro (cm)</option>
                                    <option value="kg">Quilograma (kg)</option>
                                    <option value="l">Litro (l)</option>
                                    <option value="m²">Metro² (m²)</option>
                                    <option value="m³">Metro³ (m³)</option>
                                </select>
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
                        
                        {/* Campos de Fracionamento */}
                        <div className="border-t border-gray-200 dark:border-dark-border pt-4">
                            <div className="flex items-center gap-2 mb-3">
                                <input
                                    type="checkbox"
                                    id="fracionamentoCheckbox"
                                    checked={fracionamentoAtivo}
                                    onChange={(e) => {
                                        setFracionamentoAtivo(e.target.checked);
                                        if (!e.target.checked) {
                                            setQuantidadeFracionada('');
                                            setTipoEmbalagem('CAIXA');
                                            setUnidadeEmbalagem('cx');
                                        }
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="fracionamentoCheckbox" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                    Este item vem em caixa/pacote
                                </label>
                            </div>
                            
                            {fracionamentoAtivo && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Quantidade por embalagem *
                                        </label>
                                        <input
                                            type="number"
                                            value={quantidadeFracionada}
                                            onChange={(e) => setQuantidadeFracionada(e.target.value)}
                                            placeholder="Ex: 100"
                                            min="1"
                                            step="1"
                                            required={fracionamentoAtivo}
                                            className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Tipo de embalagem
                                        </label>
                                        <select
                                            value={tipoEmbalagem}
                                            onChange={(e) => {
                                                setTipoEmbalagem(e.target.value);
                                                // Atualizar unidade automaticamente
                                                const unidades: { [key: string]: string } = {
                                                    'CAIXA': 'cx',
                                                    'PACOTE': 'pct',
                                                    'FARDO': 'fardo',
                                                    'OUTRO': 'un'
                                                };
                                                setUnidadeEmbalagem(unidades[e.target.value] || 'un');
                                            }}
                                            className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white text-sm"
                                        >
                                            <option value="CAIXA">Caixa</option>
                                            <option value="PACOTE">Pacote</option>
                                            <option value="FARDO">Fardo</option>
                                            <option value="OUTRO">Outro</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Unidade da embalagem
                                        </label>
                                        <input
                                            type="text"
                                            value={unidadeEmbalagem}
                                            onChange={(e) => setUnidadeEmbalagem(e.target.value)}
                                            placeholder="Ex: cx, pct"
                                            className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white text-sm"
                                        />
                                    </div>
                                    {fracionamentoAtivo && quantidadeFracionada && productToAdd.quantity && (
                                        <div className="md:col-span-3 mt-2">
                                            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                                                📦 {productToAdd.quantity} {tipoEmbalagem.toLowerCase()}(s) × {quantidadeFracionada} un = {parseFloat(productToAdd.quantity) * parseFloat(quantidadeFracionada)} unidades no estoque
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        </div>
                    </div>

                    {/* Lista de Itens */}
                    {purchaseItems.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 dark:bg-dark-bg rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-border">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-dark-hover rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">📦</span>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum item adicionado</p>
                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Adicione produtos à sua compra</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {purchaseItems.map((item, index) => (
                                <div key={index} className="bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border p-4 rounded-xl">
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900 dark:text-white">{item.productName}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {item.quantity} {item.unidadeMedida || 'un'} × R$ {item.unitCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                {item.quantidadeFracionada && (
                                                    <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                                                        ({item.quantity} {item.tipoEmbalagem?.toLowerCase() || 'embalagens'} = {item.quantity * item.quantidadeFracionada} unidades)
                                                    </span>
                                                )}
                                            </p>
                                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                {item.ncm && <span className="mr-3">NCM: {item.ncm}</span>}
                                                {item.sku && <span className="mr-3">SKU: {item.sku}</span>}
                                                {item.unidadeMedida && <span>Unidade: {item.unidadeMedida}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="font-bold text-orange-700 dark:text-orange-400">
                                                R$ {item.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setItemFracionamentoEditando({
                                                        productName: item.productName,
                                                        quantity: item.quantity,
                                                        quantidadeFracionada: item.quantidadeFracionada,
                                                        tipoEmbalagem: item.tipoEmbalagem,
                                                        unidadeEmbalagem: item.unidadeEmbalagem
                                                        // Nota: compraId não disponível em NovaCompraPage (compra ainda não foi criada)
                                                    });
                                                    setFracionamentoModalOpen(true);
                                                }}
                                                className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-semibold"
                                                title="Editar fracionamento"
                                            >
                                                📦 Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveProduct(index)}
                                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-2 border-orange-200 dark:border-orange-800 p-4 rounded-xl">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold text-gray-800 dark:text-white">Total Geral:</span>
                                    <span className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                                        R$ {totalProdutosCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Custos e Pagamento */}
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6 border border-gray-200 dark:border-dark-border">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Custos e Pagamento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Valor do Frete</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={frete}
                                onChange={(e) => setFrete(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                placeholder="0,00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Outras Despesas/Descontos</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={outrasDespesas}
                                onChange={(e) => setOutrasDespesas(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                placeholder="0,00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Valor IPI</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={valorIPI}
                                onChange={(e) => setValorIPI(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                placeholder="0,00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Total Produtos</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={valorTotalProdutos || String(totalProdutosCalculado)}
                                onChange={(e) => setValorTotalProdutos(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Condição de Pagamento</label>
                            <select
                                value={condicaoPagamento}
                                onChange={(e) => setCondicaoPagamento(e.target.value as any)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                            >
                                <option value="AVISTA">À vista</option>
                                <option value="PARCELADO">Parcelado</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Status da Compra *
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as PurchaseStatus)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 font-semibold dark:bg-dark-bg dark:text-white"
                            >
                                <option value={PurchaseStatus.Pendente}>⏳ Pendente</option>
                                <option value={PurchaseStatus.Recebido}>✅ Recebido (Entrada no Estoque)</option>
                                <option value={PurchaseStatus.Cancelado}>❌ Cancelado</option>
                            </select>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                ⚠️ Somente compras com status "Recebido" atualizam o estoque
                            </p>
                        </div>
                        {condicaoPagamento === 'PARCELADO' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Número de Parcelas</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={numParcelas}
                                    onChange={(e) => setNumParcelas(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                />
                            </div>
                        )}
                    </div>
                    {condicaoPagamento === 'PARCELADO' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Data do 1º Vencimento</label>
                                <input
                                    type="date"
                                    value={dataPrimeiroVencimento}
                                    onChange={(e) => setDataPrimeiroVencimento(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Parcelas */}
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6 border border-gray-200 dark:border-dark-border">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Faturas / Parcelas (Duplicatas)</h3>
                    <div className="space-y-3">
                        {parcelas.length === 0 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma parcela adicionada.</p>
                        )}
                        {parcelas.map((p, i) => (
                            <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border p-3 rounded-xl">
                                <input
                                    type="text"
                                    value={p.numero}
                                    onChange={(e) => setParcelas(prev => prev.map((px, idx) => idx === i ? { ...px, numero: e.target.value } : px))}
                                    className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white"
                                    placeholder="Número"
                                />
                                <input
                                    type="date"
                                    value={p.dataVencimento}
                                    onChange={(e) => setParcelas(prev => prev.map((px, idx) => idx === i ? { ...px, dataVencimento: e.target.value } : px))}
                                    className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white"
                                />
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={p.valor}
                                    onChange={(e) => setParcelas(prev => prev.map((px, idx) => idx === i ? { ...px, valor: parseFloat(e.target.value || '0') } : px))}
                                    className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg dark:bg-dark-bg dark:text-white"
                                    placeholder="Valor"
                                />
                                <button
                                    type="button"
                                    onClick={() => setParcelas(prev => prev.filter((_, idx) => idx !== i))}
                                    className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 font-semibold"
                                >
                                    Remover
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setParcelas(prev => [...prev, { numero: String(prev.length + 1).padStart(3, '0'), dataVencimento: '', valor: 0 }])}
                            className="px-4 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 font-semibold"
                        >
                            Adicionar Parcela
                        </button>
                    </div>
                </div>

                {/* Resumo de Totais */}
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-2 border-orange-200 dark:border-orange-800 p-4 rounded-xl">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            <div className="font-semibold">Produtos</div>
                            <div>R$ {(valorTotalProdutos ? parseFloat(valorTotalProdutos) : totalProdutosCalculado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            <div className="font-semibold">IPI</div>
                            <div>R$ {parseFloat(valorIPI || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            <div className="font-semibold">Frete</div>
                            <div>R$ {parseFloat(frete || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            <div className="font-semibold">Outras Despesas</div>
                            <div>R$ {parseFloat(outrasDespesas || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-semibold text-gray-800 dark:text-white">TOTAL GERAL DA NOTA</div>
                            <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">R$ {valorTotalNotaCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                    </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-dark-border sticky bottom-0 bg-gray-50 dark:bg-dark-bg py-4">
                    <button
                        type="button"
                        onClick={() => navigate('/compras')}
                        className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-all font-semibold shadow-soft"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-medium font-semibold flex items-center gap-2"
                    >
                        <CheckIcon className="w-5 h-5" />
                        Registrar Compra
                    </button>
                </div>
            </form>
            {/* Modal de Editar Fracionamento */}
            <EditarFracionamentoModal
                isOpen={fracionamentoModalOpen}
                onClose={() => {
                    setFracionamentoModalOpen(false);
                    setItemFracionamentoEditando(null);
                }}
                item={itemFracionamentoEditando}
                onSave={(fracionamento) => {
                    if (itemFracionamentoEditando) {
                        const updatedItems = purchaseItems.map((item: any) => {
                            if (item.productName === itemFracionamentoEditando.productName && 
                                item.quantity === itemFracionamentoEditando.quantity) {
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
        </div>
    );
};

export default NovaCompraPage;

