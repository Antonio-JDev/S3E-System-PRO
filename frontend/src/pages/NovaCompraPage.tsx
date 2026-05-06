import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { type PurchaseOrderItem, PurchaseStatus } from '../types';
import { comprasService } from '../services/comprasService';
import { readFileAsText } from '../utils/xmlParser';
import { matchCrossSearch } from '../utils/searchUtils';
import { axiosApiService } from '../services/axiosApi';
import { getUploadUrl } from '../config/api';
import { fornecedoresService, type Fornecedor } from '../services/fornecedoresService';
import { formatCNPJ, formatTelefoneBR } from '../utils/inputMasks';
import { empresaFiscalService } from '../services/empresaFiscalService';
import EditarFracionamentoModal from '../components/EditarFracionamentoModal';
import ConverterUnidadeModal from '../components/ConverterUnidadeModal';
import MaterialDetailsModal from '../components/modals/MaterialDetailsModal';

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
    materialId?: string; // ID do material do estoque vinculado
    materialVinculado?: any; // Dados completos do material vinculado (para exibição)
    matchAutomatico?: boolean; // Indica se foi feito match automático pelo sistema
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
    const [classificacao, setClassificacao] = useState<'COMPOSICAO_ESTOQUE' | 'FERRAMENTAS' | 'RECURSOS_HUMANOS' | 'LIMPEZA_INSUMOS' | 'ESCRITORIO_INSUMOS' | 'DESPESAS_VARIADAS'>('COMPOSICAO_ESTOQUE');
    const isDespesasVariadas = classificacao === 'DESPESAS_VARIADAS';

    useEffect(() => {
        if (classificacao === 'DESPESAS_VARIADAS') {
            setStatus(PurchaseStatus.Recebido);
        }
    }, [classificacao]);

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
    // Busca de fornecedores cadastrados (preenchimento manual)
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [showFornecedorDropdown, setShowFornecedorDropdown] = useState(false);
    const fornecedorDropdownRef = useRef<HTMLDivElement>(null);

    // Custos e pagamento
    const [frete, setFrete] = useState<string>('0');
    const [outrasDespesas, setOutrasDespesas] = useState<string>('0');
    const [descontos, setDescontos] = useState<string>('0');
    const [condicaoPagamento, setCondicaoPagamento] = useState<'AVISTA' | 'PARCELADO'>('AVISTA');

    // Campos fiscais
    const [destinatarioCNPJ, setDestinatarioCNPJ] = useState<string>('');
    const [statusImportacao, setStatusImportacao] = useState<'MANUAL' | 'XML'>('MANUAL');
    // Empresa Compradora (lista de empresas cadastradas)
    const [empresasFiscais, setEmpresasFiscais] = useState<any[]>([]);
    const [empresaCompradoraId, setEmpresaCompradoraId] = useState<string>('');
    const [empresaCompradoraNome, setEmpresaCompradoraNome] = useState<string>('');
    const [empresaCompradoraCNPJ, setEmpresaCompradoraCNPJ] = useState<string>('');
    const [dataEmissaoNF, setDataEmissaoNF] = useState<string>(new Date().toISOString().split('T')[0]);
    const [valorIPI, setValorIPI] = useState<string>('0');

    // Parcelas
    const [parcelas, setParcelas] = useState<Array<{ numero: string; dataVencimento: string; valor: number }>>([]);
    const [observacoes, setObservacoes] = useState('');

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
    const [buscaMaterialPorItem, setBuscaMaterialPorItem] = useState<{ [key: number]: string }>({});
    const [materialVisualizando, setMaterialVisualizando] = useState<{ itemIndex: number; material: any } | null>(null);
    
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
    
    // Estados para conversão de unidade
    const [conversaoUnidadeModalOpen, setConversaoUnidadeModalOpen] = useState(false);
    const [itemConversaoUnidade, setItemConversaoUnidade] = useState<{
        productName: string;
        quantity: number;
        unitCost: number;
        totalCost: number;
        unidadeMedida?: string;
    } | null>(null);

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

    // Carregar fornecedores cadastrados para busca no preenchimento manual
    useEffect(() => {
        const carregarFornecedores = async () => {
            try {
                const resp = await fornecedoresService.listar({ ativo: true });
                const data = (resp as any)?.data ?? (resp as any);
                setFornecedores(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Erro ao carregar fornecedores:', error);
                setFornecedores([]);
            }
        };
        carregarFornecedores();
    }, []);

    // Carregar empresas fiscais (para seletor de Empresa Compradora)
    useEffect(() => {
        const carregarEmpresasFiscais = async () => {
            try {
                const response = await empresaFiscalService.listar();
                const data = (response as any)?.data ?? (response as any);
                setEmpresasFiscais(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Erro ao carregar empresas fiscais:', error);
                setEmpresasFiscais([]);
            }
        };
        carregarEmpresasFiscais();
    }, []);

    // Handler: ao selecionar Empresa Compradora, preenche nome, CNPJ e CNPJ Destinatário
    const handleEmpresaCompradoraChange = (empresaId: string) => {
        setEmpresaCompradoraId(empresaId);
        if (empresaId === 'manual') {
            setEmpresaCompradoraNome('');
            setEmpresaCompradoraCNPJ('');
            setDestinatarioCNPJ('');
        } else {
            const empresa = empresasFiscais.find((e: any) => e.id === empresaId);
            if (empresa) {
                const nome = empresa.razaoSocial || empresa.nomeFantasia || '';
                const cnpj = empresa.cnpj ? formatCNPJ(String(empresa.cnpj)) : '';
                setEmpresaCompradoraNome(nome);
                setEmpresaCompradoraCNPJ(cnpj);
                setDestinatarioCNPJ(cnpj);
            } else {
                setEmpresaCompradoraNome('');
                setEmpresaCompradoraCNPJ('');
            }
        }
    };

    // Fechar dropdown de fornecedor ao clicar fora
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (fornecedorDropdownRef.current && !fornecedorDropdownRef.current.contains(e.target as Node)) {
                setShowFornecedorDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Normaliza texto para busca (remove acentos, lowercase)
    const normalizarParaBusca = (texto: string) =>
        (texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Fornecedores filtrados pela digitação - cada caractere filtra em tempo real
    // Prioriza: nome começa com termo > alguma palavra começa com termo > nome contém termo > CNPJ contém dígitos
    const fornecedoresFiltrados = useMemo(() => {
        const termo = supplierName.trim();
        if (!termo) return fornecedores.slice(0, 10);

        const termoNorm = normalizarParaBusca(termo);
        const termoDigitos = termo.replace(/\D/g, '');

        const filtrar = fornecedores
            .map((f) => {
                const nomeNorm = normalizarParaBusca(f.nome);
                const cnpjDigits = (f.cnpj || '').replace(/\D/g, '');
                const palavras = nomeNorm.split(/\s+/);

                // Verifica se corresponde
                const nomeComecaCom = nomeNorm.startsWith(termoNorm);
                const algumaPalavraComeca = palavras.some((p) => p.startsWith(termoNorm));
                const nomeContem = nomeNorm.includes(termoNorm);
                const cnpjContem = termoDigitos.length >= 2 && cnpjDigits.includes(termoDigitos);

                if (!nomeComecaCom && !algumaPalavraComeca && !nomeContem && !cnpjContem) return null;

                // Ordenação: melhores matches primeiro
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

        return filtrar;
    }, [fornecedores, supplierName]);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSupplierPhone(formatTelefoneBR(e.target.value));
    };

    // Preencher todos os dados do fornecedor ao selecionar na lista
    const handleSelecionarFornecedor = (f: Fornecedor) => {
        setSupplierName(f.nome);
        setSupplierCNPJ(f.cnpj ? formatCNPJ(String(f.cnpj)) : '');
        setSupplierPhone(f.telefone ? formatTelefoneBR(f.telefone) : '');
        setSupplierEmail(f.email || '');
        const partes = [f.endereco, f.cidade, f.estado, f.cep].filter(Boolean);
        setSupplierAddress(partes.join(partes.length > 1 ? ', ' : ''));
        setShowFornecedorDropdown(false);
    };

    // Calculated values
    const totalProdutosCalculado = useMemo(() => {
        return purchaseItems.reduce((total, item) => total + item.totalCost, 0);
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

    // Filtrar materiais pela busca
    const materiaisFiltrados = useMemo(() => {
        if (!buscaMaterial) return [];
        return materiais.filter(m => 
            matchCrossSearch(buscaMaterial, m.nome) ||
            (m.sku || '').toLowerCase().includes(buscaMaterial.toLowerCase()) ||
            (m.descricao && m.descricao.toLowerCase().includes(buscaMaterial.toLowerCase()))
        ).slice(0, 10); // Limitar a 10 resultados
    }, [buscaMaterial, materiais]);

    // Filtrar materiais por item específico
    const getMateriaisFiltradosPorItem = (itemIndex: number) => {
        const busca = buscaMaterialPorItem[itemIndex] || '';
        if (!busca) return [];
        return materiais.filter(m => 
            matchCrossSearch(busca, m.nome) ||
            (m.sku || '').toLowerCase().includes(busca.toLowerCase()) ||
            (m.descricao && m.descricao.toLowerCase().includes(busca.toLowerCase()))
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
                    matchAutomatico: false
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
                    matchAutomatico: false
                };
            }
            return item;
        }));
    };

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
                setSupplierCNPJ(data.fornecedor.cnpj ? formatCNPJ(String(data.fornecedor.cnpj)) : '');
                setSupplierAddress(data.fornecedor.endereco || '');
            }

            // Preencher Informações da Compra
            setInvoiceNumber(data.numeroNF || '');
            if (data.dataEmissao) {
                const dataEmissaoStr = (typeof data.dataEmissao === 'string' ? data.dataEmissao : '').split('T')[0];
                if (dataEmissaoStr) {
                    setDataEmissaoNF(dataEmissaoStr);
                    setPurchaseDate(dataEmissaoStr);
                }
            }

            // Preencher CNPJ Destinatário e tentar corresponder Empresa Compradora
            const cnpjDest = data.destinatarioCNPJ != null ? String(data.destinatarioCNPJ) : '';
            setDestinatarioCNPJ(cnpjDest ? formatCNPJ(cnpjDest) : '');
            if (cnpjDest) {
                const cnpjLimpo = cnpjDest.replace(/\D/g, '');
                const empresaMatch = empresasFiscais.find((e: any) => (e.cnpj || '').replace(/\D/g, '') === cnpjLimpo);
                if (empresaMatch) {
                    setEmpresaCompradoraId(empresaMatch.id);
                    setEmpresaCompradoraNome(empresaMatch.razaoSocial || empresaMatch.nomeFantasia || '');
                    setEmpresaCompradoraCNPJ(empresaMatch.cnpj ? formatCNPJ(String(empresaMatch.cnpj)) : '');
                }
            }

            // Preencher Valores Fiscais
            setValorIPI(String(data.valorIPI || 0));
            setFrete(String(data.valorFrete || 0));
            setOutrasDespesas(String(data.outrasDespesas || 0));
            setDescontos(String(data.valorDesconto ?? 0));

            // Preencher Itens
            if (data.items && Array.isArray(data.items)) {
                const xmlItems: ExtendedItem[] = data.items.map((item: any) => ({
                    productId: item.materialId || '',
                    productName: item.nomeProduto || '',
                    quantity: item.quantidade || 0,
                    unitCost: item.valorUnit || 0,
                    totalCost: item.valorTotal || 0,
                    ncm: item.ncm || '',
                    sku: item.sku || '',
                    unidadeMedida: item.unidadeMedida || item.unidade || 'un',
                    materialId: item.materialId, // ✅ Preservar materialId se vier do backend (match automático)
                    materialVinculado: item.materialVinculado, // ✅ Dados completos do material vinculado
                    matchAutomatico: !!item.matchAutomatico // ✅ Flag indicando match automático
                }));
                setPurchaseItems(xmlItems);
                console.log(`✅ ${xmlItems.length} itens adicionados ao formulário`);
                // Log dos matches automáticos
                const matchesAutomaticos = xmlItems.filter(it => it.matchAutomatico).length;
                if (matchesAutomaticos > 0) {
                    console.log(`🔍 ${matchesAutomaticos} item(ns) com match automático encontrado(s)`);
                }
            }

            // Preencher Parcelas (Faturas / Duplicatas) — sem usar número de parcelas nem data 1º vencimento
            if (data.parcelas && Array.isArray(data.parcelas) && data.parcelas.length > 0) {
                const xmlParcelas = data.parcelas.map((p: any) => ({
                    numero: p.numero || '',
                    dataVencimento: p.dataVencimento || '',
                    valor: p.valor || 0
                }));
                setParcelas(xmlParcelas);
                console.log(`✅ ${xmlParcelas.length} parcelas adicionadas`);
                setCondicaoPagamento(xmlParcelas.length > 1 ? 'PARCELADO' : 'AVISTA');
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

        // Obrigatório pelo menos uma fatura/parcela (gera Contas a Pagar)
        if (parcelas.length === 0) {
            toast.error('Registre pelo menos uma fatura ou parcela', {
                description: 'Na seção "Faturas / Parcelas (Duplicatas)" clique em "Adicionar Parcela" e preencha número, data de vencimento e valor.',
                duration: 6000
            });
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

        try {
            const payload: any = {
                fornecedorNome: supplierName,
                fornecedorCNPJ: supplierCNPJ,
                fornecedorTel: supplierPhone,
                numeroNF: invoiceNumber,
                dataEmissaoNF: dataEmissaoNF || purchaseDate,
                dataCompra: purchaseDate,
                status: status,
                classificacao: classificacao, // ✅ NOVO: Classificação da compra
                valorFrete: parseFloat(frete || '0') || 0,
                outrasDespesas: parseFloat(outrasDespesas || '0') || 0,
                valorDesconto: parseFloat(descontos || '0') || 0,
                items: purchaseItems.map((it) => ({
                    nomeProduto: it.productName,
                    quantidade: it.quantity,
                    valorUnit: it.unitCost,
                    ncm: (it as any).ncm,
                    sku: (it as any).sku,
                    unidadeMedida: it.unidadeMedida || 'un',
                    materialId: (it as ExtendedItem).materialId, // ✅ Incluir materialId quando houver vinculação
                    // Campos de fracionamento
                    quantidadeFracionada: it.quantidadeFracionada,
                    tipoEmbalagem: it.tipoEmbalagem,
                    unidadeEmbalagem: it.unidadeEmbalagem
                })),
                observacoes: observacoes.trim() || undefined,
                condicoesPagamento: condicaoPagamento === 'PARCELADO' ? 'PARCELADO' : 'AVISTA',
                destinatarioCNPJ: destinatarioCNPJ || empresaCompradoraCNPJ,
                statusImportacao,
                empresaCompradoraNome: empresaCompradoraNome || undefined,
                empresaCompradoraCNPJ: empresaCompradoraCNPJ || undefined,
                valorIPI: parseFloat(valorIPI || '0') || 0,
                valorTotalProdutos: totalProdutosCalculado,
                valorTotalNota: valorTotalNotaCalculado,
                duplicatas: parcelas
            };

            console.log('📤 Criando nova compra:', payload);
            const response = await comprasService.createCompra(payload);
            const estatisticas = (response as any)?.estatisticas || (response as any)?.data?.estatisticas;

            if (classificacao === 'DESPESAS_VARIADAS') {
                toast.success('Despesa registrada', {
                    description:
                        'Compra e contas a pagar registradas. Não há recebimento de mercadoria nem entrada em estoque.',
                    duration: 5000
                });
            } else if (estatisticas) {
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
                        <div className="relative" ref={fornecedorDropdownRef}>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Nome do Fornecedor *
                            </label>
                            <input
                                type="text"
                                value={supplierName}
                                onChange={(e) => {
                                    setSupplierName(e.target.value);
                                    setShowFornecedorDropdown(true);
                                }}
                                onFocus={() => setShowFornecedorDropdown(true)}
                                required
                                autoComplete="off"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                placeholder="Digite para buscar fornecedores cadastrados ou nome da empresa"
                            />
                            {showFornecedorDropdown && fornecedoresFiltrados.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-lg max-h-60 overflow-auto">
                                    {fornecedoresFiltrados.map((f) => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => handleSelecionarFornecedor(f)}
                                            className="w-full text-left px-4 py-3 hover:bg-orange-50 dark:hover:bg-orange-900/20 border-b border-gray-100 dark:border-dark-border last:border-b-0 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="font-medium text-gray-900 dark:text-white">{f.nome}</div>
                                                {f.cnpj && (
                                                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded font-mono">
                                                        {f.cnpj}
                                                    </span>
                                                )}
                                            </div>
                                            {f.endereco && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{f.endereco}</div>
                                            )}
                                            {f.telefone && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Tel: {f.telefone}</div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                CNPJ
                            </label>
                            <input
                                type="text"
                                value={supplierCNPJ}
                                onChange={(e) => setSupplierCNPJ(formatCNPJ(e.target.value))}
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
                                onChange={handlePhoneChange}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                placeholder="(00) 00000-0000"
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

                {/* Card de Classificação da Compra */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl shadow-soft p-6 border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                Classificação da Compra
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Selecione a classificação que melhor descreve esta compra
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                        {/* Composição Estoque */}
                        <button
                            type="button"
                            onClick={() => setClassificacao('COMPOSICAO_ESTOQUE')}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                                classificacao === 'COMPOSICAO_ESTOQUE'
                                    ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-card hover:border-blue-300 dark:hover:border-blue-700'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${classificacao === 'COMPOSICAO_ESTOQUE' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900 dark:text-white">Composição Estoque</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Sempre incrementa materiais ao estoque</div>
                                </div>
                                {classificacao === 'COMPOSICAO_ESTOQUE' && (
                                    <div className="text-blue-500">
                                        <CheckIcon className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                        </button>

                        {/* Ferramentas */}
                        <button
                            type="button"
                            onClick={() => setClassificacao('FERRAMENTAS')}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                                classificacao === 'FERRAMENTAS'
                                    ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-card hover:border-blue-300 dark:hover:border-blue-700'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${classificacao === 'FERRAMENTAS' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900 dark:text-white">Ferramentas</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Equipamentos e ferramentas</div>
                                </div>
                                {classificacao === 'FERRAMENTAS' && (
                                    <div className="text-blue-500">
                                        <CheckIcon className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                        </button>

                        {/* Recursos Humanos */}
                        <button
                            type="button"
                            onClick={() => setClassificacao('RECURSOS_HUMANOS')}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                                classificacao === 'RECURSOS_HUMANOS'
                                    ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-card hover:border-blue-300 dark:hover:border-blue-700'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${classificacao === 'RECURSOS_HUMANOS' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900 dark:text-white">Recursos Humanos</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">EPIs, uniformes, equipamentos para funcionários</div>
                                </div>
                                {classificacao === 'RECURSOS_HUMANOS' && (
                                    <div className="text-blue-500">
                                        <CheckIcon className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                        </button>

                        {/* Limpeza - Insumos */}
                        <button
                            type="button"
                            onClick={() => setClassificacao('LIMPEZA_INSUMOS')}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                                classificacao === 'LIMPEZA_INSUMOS'
                                    ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-card hover:border-blue-300 dark:hover:border-blue-700'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${classificacao === 'LIMPEZA_INSUMOS' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900 dark:text-white">Limpeza - Insumos</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Produtos de limpeza e higiene</div>
                                </div>
                                {classificacao === 'LIMPEZA_INSUMOS' && (
                                    <div className="text-blue-500">
                                        <CheckIcon className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                        </button>

                        {/* Escritório - Insumos */}
                        <button
                            type="button"
                            onClick={() => setClassificacao('ESCRITORIO_INSUMOS')}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                                classificacao === 'ESCRITORIO_INSUMOS'
                                    ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-card hover:border-blue-300 dark:hover:border-blue-700'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${classificacao === 'ESCRITORIO_INSUMOS' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900 dark:text-white">Escritório - Insumos</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Materiais de escritório e papelaria</div>
                                </div>
                                {classificacao === 'ESCRITORIO_INSUMOS' && (
                                    <div className="text-blue-500">
                                        <CheckIcon className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                        </button>

                        {/* Despesas Variadas */}
                        <button
                            type="button"
                            onClick={() => setClassificacao('DESPESAS_VARIADAS')}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                                classificacao === 'DESPESAS_VARIADAS'
                                    ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-card hover:border-blue-300 dark:hover:border-blue-700'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${classificacao === 'DESPESAS_VARIADAS' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-900 dark:text-white">Despesas Variadas</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Outras despesas diversas</div>
                                </div>
                                {classificacao === 'DESPESAS_VARIADAS' && (
                                    <div className="text-blue-500">
                                        <CheckIcon className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                        </button>
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
                                Data de Emissão da NF
                            </label>
                            <input
                                type="date"
                                value={dataEmissaoNF}
                                onChange={(e) => setDataEmissaoNF(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                title="Preenchida automaticamente ao importar XML ou informe manualmente"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Preenchida pelo XML ou manualmente</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as PurchaseStatus)}
                                disabled={isDespesasVariadas}
                                title={isDespesasVariadas ? 'Despesas variadas são registradas como concluídas (sem remessa).' : undefined}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white disabled:opacity-70"
                            >
                                <option value={PurchaseStatus.Pendente}>Pendente</option>
                                <option value={PurchaseStatus.Recebido}>Recebido</option>
                                <option value={PurchaseStatus.Cancelado}>Cancelado</option>
                            </select>
                            {isDespesasVariadas && (
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                    Despesas variadas não aguardam recebimento de mercadoria; o status fica como concluído para fins de compra e financeiro.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">CNPJ Destinatário</label>
                            <input
                                type="text"
                                value={destinatarioCNPJ}
                                onChange={(e) => {
                                    const v = formatCNPJ(e.target.value);
                                    setDestinatarioCNPJ(v);
                                    if (empresaCompradoraId === 'manual') {
                                        setEmpresaCompradoraCNPJ(v);
                                    }
                                }}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white"
                                placeholder="00.000.000/0000-00"
                            />
                        </div>
                    </div>

                    {/* Empresa Compradora - Seletor de empresas cadastradas */}
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">🏢</span>
                            Empresa Compradora
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Selecionar Empresa
                                </label>
                                <select
                                    value={empresaCompradoraId}
                                    onChange={(e) => handleEmpresaCompradoraChange(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 bg-white dark:bg-dark-bg dark:text-white"
                                >
                                    <option value="">Selecione uma empresa...</option>
                                    {empresasFiscais.map((empresa: any) => (
                                        <option key={empresa.id} value={empresa.id}>
                                            {(empresa.razaoSocial || empresa.nomeFantasia || '').substring(0, 50)}{(empresa.razaoSocial || empresa.nomeFantasia || '').length > 50 ? '...' : ''} - {empresa.cnpj || ''}
                                        </option>
                                    ))}
                                    <option value="manual">Manual</option>
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Nome da Empresa
                                </label>
                                <input
                                    type="text"
                                    value={empresaCompradoraNome}
                                    onChange={(e) => setEmpresaCompradoraNome(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 bg-gray-50 dark:bg-dark-bg dark:text-white"
                                    placeholder="Nome/Razão Social"
                                    readOnly={empresaCompradoraId ? empresaCompradoraId !== 'manual' : false}
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    CNPJ da Empresa
                                </label>
                                <input
                                    type="text"
                                    value={empresaCompradoraCNPJ}
                                    onChange={(e) => {
                                        const v = formatCNPJ(e.target.value);
                                        setEmpresaCompradoraCNPJ(v);
                                        if (empresaCompradoraId === 'manual') setDestinatarioCNPJ(v);
                                    }}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 bg-gray-50 dark:bg-dark-bg dark:text-white"
                                    placeholder="00.000.000/0000-00"
                                    readOnly={empresaCompradoraId && empresaCompradoraId !== 'manual'}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                            💡 Selecione a empresa compradora para preencher automaticamente o CNPJ destinatário
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
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
                        <div className="flex flex-col justify-end">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Total de produtos e total da nota são calculados automaticamente na seção <strong>Custos e Pagamento</strong> e no resumo ao final.
                            </p>
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
                            {purchaseItems.map((item, index) => {
                                const materiaisFiltradosItem = getMateriaisFiltradosPorItem(index);
                                const mostraBusca = buscaMaterialPorItem[index] !== undefined;
                                
                                return (
                                    <div key={index} className="bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border p-4 rounded-xl">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-start gap-3 mb-2">
                                                    {/* Coluna de Foto */}
                                                    <div className="flex-shrink-0">
                                                        {item.materialVinculado?.imagemUrl ? (
                                                            <img
                                                                src={getUploadUrl(item.materialVinculado.imagemUrl)}
                                                                alt={item.materialVinculado.nome || item.productName}
                                                                className="w-16 h-16 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                                                                onError={(e) => {
                                                                    const imgElement = e.target as HTMLImageElement;
                                                                    imgElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-300 dark:border-gray-600">
                                                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </div>
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
                                                    
                                                    {/* Indicadores de vinculação */}
                                                    <div className="flex flex-col items-end gap-2">
                                                        {item.materialId && item.materialVinculado && !item.matchAutomatico ? (
                                                            // Vinculação manual pelo usuário
                                                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-semibold">
                                                                ✅ Vinculado: {item.materialVinculado.nome}
                                                            </span>
                                                        ) : item.matchAutomatico && item.materialVinculado ? (
                                                            // Match automático encontrado pelo sistema
                                                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded text-xs font-semibold">
                                                                ⚠️ Match automático: {item.materialVinculado.nome}
                                                            </span>
                                                        ) : (
                                                            // Nenhum match - será criado novo material
                                                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-semibold">
                                                                🆕 Será criado novo material
                                                            </span>
                                                        )}
                                                        
                                                        {/* Botões de ação */}
                                                        <div className="flex items-center gap-2">
                                                            {/* Botão de olho para visualizar material (mostrar se houver materialId E materialVinculado) */}
                                                            {item.materialId && item.materialVinculado && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setMaterialVisualizando({ itemIndex: index, material: item.materialVinculado })}
                                                                    className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                                    title={item.matchAutomatico ? "Verificar material sugerido pelo sistema" : "Visualizar material vinculado"}
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                            
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
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                                </svg>
                                                            </button>
                                                            
                                                            {/* Botão de conversão de unidade (mostrar apenas para km, m ou cm) */}
                                                            {item.unidadeMedida && ['km', 'm', 'cm'].includes(item.unidadeMedida.toLowerCase()) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setItemConversaoUnidade({
                                                                            productName: item.productName,
                                                                            quantity: item.quantity,
                                                                            unitCost: item.unitCost,
                                                                            totalCost: item.totalCost,
                                                                            unidadeMedida: item.unidadeMedida
                                                                        });
                                                                        setConversaoUnidadeModalOpen(true);
                                                                    }}
                                                                    className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                                                    title="Converter unidade de medida (km ↔ m ↔ cm)"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                            
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setItemFracionamentoEditando({
                                                                        productName: item.productName,
                                                                        quantity: item.quantity,
                                                                        quantidadeFracionada: item.quantidadeFracionada,
                                                                        tipoEmbalagem: item.tipoEmbalagem,
                                                                        unidadeEmbalagem: item.unidadeEmbalagem
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
                                                
                                                {/* Campo de busca de material */}
                                                {mostraBusca && (
                                                    <div className="mt-3 border-t border-gray-200 dark:border-dark-border pt-3">
                                                        <div className="relative">
                                                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                            </svg>
                                                            <input
                                                                type="text"
                                                                value={buscaMaterialPorItem[index] || ''}
                                                                onChange={(e) => setBuscaMaterialPorItem(prev => ({ ...prev, [index]: e.target.value }))}
                                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-bg dark:text-white text-sm"
                                                                placeholder="Buscar material do estoque por nome ou SKU..."
                                                                autoFocus
                                                            />
                                                        </div>
                                                        
                                                        {/* Lista de resultados da busca */}
                                                        {materiaisFiltradosItem.length > 0 && (
                                                            <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg">
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
                                                        {item.materialId && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removerVinculacaoMaterial(index)}
                                                                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                                                            >
                                                                Remover vinculação
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center">
                                                <p className="font-bold text-orange-700 dark:text-orange-400">
                                                    R$ {item.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
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
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Outras despesas</label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Somam ao total (ex.: seguros, taxas)</p>
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
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descontos</label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reduzem o valor dos produtos</p>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={descontos}
                                onChange={(e) => setDescontos(e.target.value)}
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
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Total produtos (automático)</label>
                            <div className="w-full px-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white font-semibold">
                                R$ {totalProdutosCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Soma dos itens acima</p>
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
                                disabled={isDespesasVariadas}
                                title={isDespesasVariadas ? 'Despesas variadas são registradas como concluídas (sem remessa).' : undefined}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 font-semibold dark:bg-dark-bg dark:text-white disabled:opacity-70"
                            >
                                <option value={PurchaseStatus.Pendente}>⏳ Pendente</option>
                                <option value={PurchaseStatus.Recebido}>✅ Recebido (Entrada no Estoque)</option>
                                <option value={PurchaseStatus.Cancelado}>❌ Cancelado</option>
                            </select>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {isDespesasVariadas
                                    ? 'Despesas variadas não entram em estoque; o registro é tratado como concluído (sem receber remessa).'
                                    : '⚠️ Somente compras com status "Recebido" atualizam o estoque'}
                            </p>
                        </div>
                    </div>
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

                {/* Observações */}
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-soft p-6 border border-gray-200 dark:border-dark-border">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Observações</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        Anotações internas sobre esta compra (visíveis nos detalhes da compra).
                    </p>
                    <textarea
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        rows={4}
                        maxLength={8000}
                        placeholder="Ex.: condições combinadas com o fornecedor, referência de pedido, etc."
                        className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-orange-500 dark:bg-dark-bg dark:text-white resize-y min-h-[100px]"
                    />
                </div>

                {/* Resumo de Totais */}
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-2 border-orange-200 dark:border-orange-800 p-4 rounded-xl">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            <div className="font-semibold">Produtos (itens)</div>
                            <div>R$ {totalProdutosCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            <div className="font-semibold">Descontos</div>
                            <div className="text-red-700 dark:text-red-400">− R$ {Math.min(parseFloat(descontos || '0') || 0, totalProdutosCalculado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
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
                            <div className="font-semibold">Outras despesas</div>
                            <div>R$ {parseFloat(outrasDespesas || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="text-right sm:col-span-2 lg:col-span-1">
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

            {/* Modal de visualização de material vinculado */}
            <MaterialDetailsModal
                open={!!materialVisualizando}
                onClose={() => setMaterialVisualizando(null)}
                item={materialVisualizando?.material ? {
                    nome: materialVisualizando.material.nome,
                    sku: materialVisualizando.material.sku,
                    ncm: materialVisualizando.material.ncm,
                    categoria: materialVisualizando.material.categoria,
                    unidadeMedida: materialVisualizando.material.unidadeMedida,
                    preco: materialVisualizando.material.preco,
                    valorVenda: materialVisualizando.material.valorVenda,
                    descricao: materialVisualizando.material.descricao,
                    material: materialVisualizando.material
                } : null}
            />
            
            {/* Modal de Conversão de Unidade */}
            <ConverterUnidadeModal
                isOpen={conversaoUnidadeModalOpen}
                onClose={() => {
                    setConversaoUnidadeModalOpen(false);
                    setItemConversaoUnidade(null);
                }}
                item={itemConversaoUnidade}
                onSave={(convertedItem) => {
                    if (itemConversaoUnidade) {
                        const updatedItems = purchaseItems.map((item: any) => {
                            if (item.productName === itemConversaoUnidade.productName && 
                                item.quantity === itemConversaoUnidade.quantity &&
                                item.unitCost === itemConversaoUnidade.unitCost) {
                                return {
                                    ...item,
                                    quantity: convertedItem.quantity,
                                    unitCost: convertedItem.unitCost,
                                    totalCost: convertedItem.totalCost,
                                    unidadeMedida: convertedItem.unidadeMedida
                                };
                            }
                            return item;
                        });
                        setPurchaseItems(updatedItems);
                        toast.success(`Unidade convertida para ${convertedItem.unidadeMedida} com sucesso!`);
                    }
                }}
            />
        </div>
    );
};

export default NovaCompraPage;

