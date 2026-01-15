import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { toast } from 'sonner';
import { type MaterialItem, MaterialCategory } from '../types';
import { materiaisService, Material } from '../services/materiaisService';
import { fornecedoresService, type Fornecedor } from '../services/fornecedoresService';
import { comprasService } from '../services/comprasService';
import { movimentacoesService } from '../services/movimentacoesService';
import { axiosApiService } from '../services/axiosApi';
import { getUploadUrl } from '../config/api';
import SupplierCombobox from './ui/SupplierCombobox';
import ViewToggle from './ui/ViewToggle';
import { loadViewMode, saveViewMode } from '../utils/viewModeStorage';
import { matchCrossSearch } from '../utils/searchUtils';
import { AuthContext } from '../contexts/AuthContext';

import { useEscapeKey } from '../hooks/useEscapeKey';
import {
    generateExampleTemplate,
    exportToJSON,
    readJSONFile,
    validateImportData,
    type MaterialTemplate,
    type ImportExportData,
} from '../utils/importExportTemplates';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.038-2.124H9.038c-1.128 0-2.038.944-2.038 2.124v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);
const ExclamationTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
);
const CubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
);
const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

interface MateriaisProps {
    toggleSidebar: () => void;
}

interface MaterialFormState {
    name: string;
    sku: string;
    type: string;
    category: MaterialCategory;
    description: string;
    stock: string;
    minStock: string;
    unitOfMeasure: string;
    location: string;
    imageUrl?: string;
    supplierId: string;
    supplierName: string;

    price: string; // Preço de custo
    custoCM: string; // Custo por centímetro (calculado automaticamente para materiais em M ou KG/M)
    valorVenda: string; // Preço de venda (para unidades padrão)
    valorVendaM: string; // Preço de venda em metros (para unidade M ou KG/M)
    valorVendaCM: string; // Preço de venda em centímetros (para unidade M ou KG/M)
    porcentagemLucro: string; // Porcentagem de lucro (calculado automaticamente)
}

const Materiais: React.FC<MateriaisProps> = ({ toggleSidebar }) => {
    const authContext = useContext(AuthContext);
    const user = authContext?.user;
    const userRole = user?.role?.toLowerCase();
    const isAdminOrDev = userRole === 'admin' || userRole === 'desenvolvedor';
    
    const [materials, setMaterials] = useState<MaterialItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados de busca e filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<MaterialCategory | 'Todos'>('Todos');
    const [stockFilter, setStockFilter] = useState<'Todos' | 'Baixo' | 'Zerado'>('Todos');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(loadViewMode('Materiais'));
    
    // Salvar viewMode no localStorage quando mudar
    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        saveViewMode('Materiais', mode);
    };
    
    // Estados do modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<MaterialItem | null>(null);
    const [itemToDelete, setItemToDelete] = useState<MaterialItem | null>(null);
    const [movimentacoesCount, setMovimentacoesCount] = useState<number>(0);
    const [kitItemsCount, setKitItemsCount] = useState<number>(0);
    const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false);

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showCorrigirNomesDialog, setShowCorrigirNomesDialog] = useState(false);
    const [atualizandoSKUs, setAtualizandoSKUs] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [materialParaVisualizar, setMaterialParaVisualizar] = useState<MaterialItem | null>(null);
    const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
    const [materialSelecionado, setMaterialSelecionado] = useState<MaterialItem | null>(null);
    const [historicoCompras, setHistoricoCompras] = useState<any[]>([]);
    const [loadingHistorico, setLoadingHistorico] = useState(false);
    
    // Estados para processar fracionamento
    const [processandoFracionamento, setProcessandoFracionamento] = useState(false);
    const [comprasFracionamentoPendentes, setComprasFracionamentoPendentes] = useState<any[]>([]);
    const [modalFracionamentoPendente, setModalFracionamentoPendente] = useState(false);
    
    // Estados para exportação/importação
    const [menuExportarOpen, setMenuExportarOpen] = useState(false);
    const [modalImportarOpen, setModalImportarOpen] = useState(false);
    const [arquivoImportar, setArquivoImportar] = useState<File | null>(null);
    const [processandoImportacao, setProcessandoImportacao] = useState(false);
    const [importing, setImporting] = useState(false);
    const [showDialogFornecedor, setShowDialogFornecedor] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [loadingFornecedores, setLoadingFornecedores] = useState(false);
    
    // Estados para upload de imagem
    const [imagemSelecionada, setImagemSelecionada] = useState<File | null>(null);
    const [previewImagem, setPreviewImagem] = useState<string | null>(null);
    const [uploadingImagem, setUploadingImagem] = useState(false);
    
    const [formState, setFormState] = useState<MaterialFormState>({
        name: '',
        sku: '',
        type: '',
        category: MaterialCategory.ELETRICO,
        description: '',
        stock: '0',
        minStock: '5',
        unitOfMeasure: 'un',
        location: 'Almoxarifado',
        imageUrl: undefined,
        supplierId: '',
        supplierName: '',

        price: '', // Preço de custo
        custoCM: '', // Custo por centímetro (calculado automaticamente para materiais em M ou KG/M)
        valorVenda: '', // Preço de venda (para unidades padrão)
        valorVendaM: '', // Preço de venda em metros (para unidade M ou KG/M)
        valorVendaCM: '', // Preço de venda em centímetros (para unidade M ou KG/M)
        porcentagemLucro: '' // Porcentagem de lucro
    });


    const loadMaterials = async () => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('📦 Carregando materiais...');
            // ✅ CORREÇÃO: Filtrar apenas materiais ativos para não mostrar materiais excluídos
            const response = await materiaisService.getMateriais({ ativo: true });
            
            if (response.success && response.data) {
                // Converter dados da API para o formato do componente
                const materialsData = response.data.map((material: Material) => ({
                    id: material.id,
                    name: material.nome || material.descricao,
                    sku: material.sku || material.codigo || 'N/A', // ✅ Usar sku do backend
                    type: material.tipo || material.categoria || 'Material',
                    category: MaterialCategory.ELETRICO, // Mapear conforme necessário
                    description: material.descricao,
                    ncm: material.ncm, // ✅ NCM do material (dado fiscal)
                    imagemUrl: material.imagemUrl, // ✅ URL da imagem do material
                    stock: material.estoque,
                    minStock: material.estoqueMinimo,
                    unitOfMeasure: material.unidadeMedida || material.unidade || 'un', // ✅ Usar unidadeMedida do backend
                    location: 'Estoque', // Campo não disponível na API

                    price: material.preco || 0,
                    valorVenda: material.valorVenda,
                    valorVendaM: (material as any).valorVendaM,
                    valorVendaCM: (material as any).valorVendaCM,
                    porcentagemLucro: material.porcentagemLucro,
                    supplier: material.fornecedor 
                        ? { id: material.fornecedor.id, name: material.fornecedor.nome } 
                        : { id: '', name: 'Sem fornecedor' },
                    // ✅ Campos de fracionamento
                    quantidadePorEmbalagem: material.quantidadePorEmbalagem,
                    tipoEmbalagem: material.tipoEmbalagem,
                    precoEmbalagem: material.precoEmbalagem,
                    precoUnitario: material.precoUnitario
                }));

                // ✅ CORREÇÃO: Exibir TODOS os materiais ativos, independente do estoque
                // O filtro por estoque zerado pode ser aplicado depois pelo usuário
                setMaterials(materialsData);
                console.log(`✅ ${materialsData.length} materiais carregados`);
            } else {
                console.warn('⚠️ Nenhum material encontrado');
                setMaterials([]);
            }
        } catch (err) {
            setError('Erro ao carregar materiais');
            console.error('❌ Erro ao carregar materiais:', err);
            setMaterials([]);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        loadMaterials();
    }, []);

    // Filtros
    const filteredMaterials = useMemo(() => {
        let filtered = materials;

        // Filtro por categoria
        if (categoryFilter !== 'Todos') {
            filtered = filtered.filter(material => material.category === categoryFilter);
        }

        // Filtro por estoque
        if (stockFilter === 'Baixo') {
            filtered = filtered.filter(material => material.stock > 0 && material.stock <= material.minStock);
        } else if (stockFilter === 'Zerado') {
            filtered = filtered.filter(material => material.stock === 0);
        }

        // Filtro por busca
        if (searchTerm) {
            filtered = filtered.filter(material =>
                matchCrossSearch(searchTerm, material.name || '') ||
                (material.sku?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (material.type?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [materials, categoryFilter, stockFilter, searchTerm]);

    // Estatísticas
    const stats = useMemo(() => {
        const totalItems = materials.length;
        const lowStock = materials.filter(m => m.stock > 0 && m.stock <= m.minStock).length;
        const outOfStock = materials.filter(m => m.stock === 0).length;
        const totalValue = materials.reduce((acc, m) => acc + (m.stock * (m.price || 0)), 0);

        return { totalItems, lowStock, outOfStock, totalValue };
    }, [materials]);


    // Função para calcular porcentagem de lucro
    const calcularPorcentagemLucro = (precoCusto: number, valorVenda: number): number => {
        if (!precoCusto || precoCusto <= 0) return 0;
        if (!valorVenda || valorVenda <= 0) return 0;
        return ((valorVenda - precoCusto) / precoCusto) * 100;
    };

    // Função auxiliar para obter o valor de venda correto baseado na unidade de medida
    const getValorVendaExibicao = (material: MaterialItem) => {
        const unidadeUpper = (material.unitOfMeasure || '').toUpperCase().trim();
        const podeVenderMCM = (unidadeUpper === 'M' || unidadeUpper === 'KG/M' || unidadeUpper === 'M/KG');
        
        if (podeVenderMCM) {
            // Para materiais em M ou KG/M, mostrar valorVendaM se disponível
            const valorVendaM = (material as any).valorVendaM;
            if (valorVendaM && valorVendaM > 0) {
                return {
                    principal: valorVendaM,
                    secundario: (material as any).valorVendaCM,
                    unidade: 'm',
                    temValor: true
                };
            }
        }
        
        // Para outras unidades ou se não tiver valorVendaM, usar valorVenda padrão
        const valorVenda = (material as any).valorVenda;
        return {
            principal: valorVenda || material.price || 0,
            secundario: null,
            unidade: material.unitOfMeasure || 'un',
            temValor: !!valorVenda
        };
    };

    // Carregar fornecedores
    const loadFornecedores = async () => {
        try {
            setLoadingFornecedores(true);
            const response = await fornecedoresService.listar({ ativo: true });
            if (response.success && response.data) {
                setFornecedores(response.data);
            }
        } catch (error) {
            console.error('Erro ao carregar fornecedores:', error);
        } finally {
            setLoadingFornecedores(false);
        }
    };

    // Handlers
    const handleOpenModal = (item: MaterialItem | null = null) => {
        // Carregar fornecedores quando abrir o modal
        loadFornecedores();
        
        if (item) {
            // ✅ Removida lógica automática que forçava unidade baseada no nome
            // Agora o usuário tem controle total sobre a unidade de medida
            setItemToEdit(item);
            setFormState({
                name: item.name,
                sku: item.sku || 'N/A', // ✅ Garantir que SKU seja exibido
                type: item.type,
                category: item.category,
                description: item.description,
                stock: item.stock.toString(),
                minStock: item.minStock.toString(),
                unitOfMeasure: item.unitOfMeasure || 'un', // ✅ Usar unidade do item
                location: item.location || '',
                imageUrl: item.imageUrl,
                supplierId: item.supplier?.id || item.supplierId || '',
                supplierName: item.supplier?.name || item.supplierName || '',

                price: (item.price || 0).toString(),
                custoCM: ((item as any).custoCM || 0).toString(),
                valorVenda: (item.valorVenda || 0).toString(),
                valorVendaM: ((item as any).valorVendaM || 0).toString(),
                valorVendaCM: ((item as any).valorVendaCM || 0).toString(),
                porcentagemLucro: (item.porcentagemLucro || (item.valorVenda && item.price
                    ? calcularPorcentagemLucro(item.price, item.valorVenda).toFixed(2)
                    : '0')).toString()
            });
        } else {
            setItemToEdit(null);
            setFormState({
                name: '',
                sku: '',
                type: '',
                category: MaterialCategory.ELETRICO,
                description: '',
                stock: '0',
                minStock: '5',
                unitOfMeasure: 'un',
                location: 'Almoxarifado',
                imageUrl: undefined,
                supplierId: '',
                supplierName: '',

                price: '',
                custoCM: '',
                valorVenda: '',
                valorVendaM: '',
                valorVendaCM: '',
                porcentagemLucro: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setItemToEdit(null);
        setImagemSelecionada(null);
        setPreviewImagem(null);
    };

    // Funções para manipulação de imagem
    const handleImagemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImagemSelecionada(file);
            
            // Criar preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImagem(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoverImagem = async () => {
        if (itemToEdit?.id && itemToEdit.imagemUrl) {
            try {
                const response = await axiosApiService.delete(`/api/materiais/${itemToEdit.id}/imagem`);
                if (response.success) {
                    toast.success('Imagem removida com sucesso!');
                    setFormState({...formState, imageUrl: undefined});
                    await loadMaterials();
                }
            } catch (error) {
                toast.error('Erro ao remover imagem');
            }
        }
        setImagemSelecionada(null);
        setPreviewImagem(null);
    };

    // Função para fechar modal de histórico
    const handleFecharHistorico = () => {
        setHistoricoModalOpen(false);
        setMaterialSelecionado(null);
        setHistoricoCompras([]);
    };

    // Fechar modais com ESC
    useEscapeKey(isModalOpen, handleCloseModal);
    useEscapeKey(viewModalOpen, () => {
        setViewModalOpen(false);
        setMaterialParaVisualizar(null);
    });
    useEscapeKey(historicoModalOpen, handleFecharHistorico);
    useEscapeKey(showDeleteDialog, () => {
        setShowDeleteDialog(false);
        setItemToDelete(null);
    });
    useEscapeKey(showCorrigirNomesDialog, () => setShowCorrigirNomesDialog(false));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {

            const precoCusto = parseFloat(formState.price) || 0;
            const custoCM = parseFloat(formState.custoCM) || 0;
            const valorVenda = parseFloat(formState.valorVenda) || 0;
            const valorVendaM = parseFloat(formState.valorVendaM) || 0;
            const valorVendaCM = parseFloat(formState.valorVendaCM) || 0;
            
            // Calcular porcentagem de lucro baseado na unidade
            let porcentagemLucro = 0;
            if (formState.unitOfMeasure === 'm' || formState.unitOfMeasure === 'kg/m') {
                // Para M ou KG/M, usar valorVendaM se disponível
                if (precoCusto > 0 && valorVendaM > 0) {
                    porcentagemLucro = calcularPorcentagemLucro(precoCusto, valorVendaM);
                }
            } else {
                // Para outras unidades, usar valorVenda padrão
                if (precoCusto > 0 && valorVenda > 0) {
                    porcentagemLucro = calcularPorcentagemLucro(precoCusto, valorVenda);
                }
            }

            // Verificar se o nome do fornecedor corresponde a um fornecedor existente
            let fornecedorIdFinal = formState.supplierId;
            if (!fornecedorIdFinal && formState.supplierName) {
                const fornecedorExistente = fornecedores.find(
                    f => f.nome.toLowerCase() === formState.supplierName.toLowerCase()
                );
                if (fornecedorExistente) {
                    fornecedorIdFinal = fornecedorExistente.id;
                }
            }

            // ✅ Removida lógica automática que forçava unidade baseada no nome
            // Agora o usuário tem controle total sobre a unidade de medida
            const unidadeMedidaFinal = formState.unitOfMeasure;

            const materialData = {
                sku: formState.sku, // ✅ Usar sku em vez de codigo
                nome: formState.name, // ✅ Incluir nome
                descricao: formState.name, // Manter descricao também
                unidadeMedida: unidadeMedidaFinal, // ✅ Usar unidadeMedida em vez de unidade

                preco: precoCusto,
                custoCM: (formState.unitOfMeasure === 'm' || formState.unitOfMeasure === 'kg/m') && custoCM > 0 ? custoCM : undefined,
                valorVenda: valorVenda > 0 ? valorVenda : undefined,
                valorVendaM: valorVendaM > 0 ? valorVendaM : undefined,
                valorVendaCM: valorVendaCM > 0 ? valorVendaCM : undefined,
                porcentagemLucro: porcentagemLucro > 0 ? porcentagemLucro : undefined,
                estoque: parseFloat(formState.stock),
                estoqueMinimo: parseFloat(formState.minStock),
                categoria: formState.type,
                tipo: formState.type, // ✅ Incluir tipo também
                fornecedorId: fornecedorIdFinal || undefined
            };

            let materialId: string;
            
            if (itemToEdit) {
                // Atualizar material existente
                const response = await materiaisService.updateMaterial(itemToEdit.id, materialData);
                if (response.success) {
                    materialId = itemToEdit.id;
                    toast.success('✅ Material atualizado com sucesso!');
                } else {
                    toast.error('❌ Erro ao atualizar material');
                    return;
                }
            } else {
                // Criar novo material
                const response = await materiaisService.createMaterial(materialData);
                if (response.success) {
                    materialId = response.data.id;
                    toast.success('✅ Material criado com sucesso!');
                } else {
                    toast.error('❌ Erro ao criar material');
                    return;
                }
            }

            // Se houver imagem selecionada, fazer upload
            if (imagemSelecionada && materialId) {
                try {
                    setUploadingImagem(true);
                    const formData = new FormData();
                    formData.append('imagem', imagemSelecionada);

                    const uploadResponse = await axiosApiService.post(
                        `/api/materiais/${materialId}/upload-imagem`,
                        formData,
                        {
                            headers: {
                                'Content-Type': 'multipart/form-data',
                            },
                        }
                    );

                    if (uploadResponse.success) {
                        toast.success('📷 Imagem enviada com sucesso!');
                    }
                } catch (error) {
                    console.error('Erro ao fazer upload da imagem:', error);
                    toast.error('❌ Erro ao enviar imagem');
                } finally {
                    setUploadingImagem(false);
                }
            }
            
            handleCloseModal();
            await loadMaterials();
        } catch (error) {
            console.error('❌ Erro ao salvar material:', error);
            toast.error('❌ Erro ao salvar material');
        }
    };


    const handleOpenDeleteDialog = async (material: MaterialItem) => {
        setItemToDelete(material);
        setShowDeleteDialog(true);
        
        // Buscar quantidade de movimentações relacionadas
        if (isAdminOrDev) {
            setLoadingMovimentacoes(true);
            try {
                const response = await movimentacoesService.listar({ materialId: material.id });
                if (response.success && response.data) {
                    const count = Array.isArray(response.data) ? response.data.length : 0;
                    setMovimentacoesCount(count);
                } else {
                    setMovimentacoesCount(0);
                }
            } catch (error) {
                console.error('Erro ao buscar movimentações:', error);
                setMovimentacoesCount(0);
            } finally {
                setLoadingMovimentacoes(false);
            }
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        
        // Verificar permissões
        if (!isAdminOrDev) {
            toast.error('Acesso negado', {
                description: 'Apenas administradores e desenvolvedores podem excluir materiais.',
            });
            setShowDeleteDialog(false);
            setItemToDelete(null);
            return;
        }
        
        try {
            setShowDeleteDialog(false);
            const materialNome = itemToDelete.name;
            // ✅ Passar ?permanent=true para excluir permanentemente (apenas admin/dev)
            const response = await materiaisService.deleteMaterial(itemToDelete.id, true);
            if (response.success) {
                // ✅ Remover imediatamente da lista antes de recarregar
                setMaterials(prev => prev.filter(m => m.id !== itemToDelete.id));
                
                const movimentacoesMsg = (response as any).movimentacoesExcluidas > 0 
                    ? ` ${(response as any).movimentacoesExcluidas} movimentação(ões) também foram excluída(s).`
                    : '';
                
                toast.success('Material excluído com sucesso!', {
                    description: `O material "${materialNome}" foi excluído permanentemente do sistema.${movimentacoesMsg}`,
                });
                setItemToDelete(null);
                
                // Recarregar para garantir sincronização com o backend
                await loadMaterials();
            } else {
                toast.error('Erro ao excluir material', {
                    description: response.error || 'Não foi possível excluir o material.',
                });
                setItemToDelete(null);
            }
        } catch (error) {
            console.error('❌ Erro ao excluir material:', error);
            toast.error('Erro ao excluir material', {
                description: 'Ocorreu um erro ao tentar excluir o material. Tente novamente.',
            });
            setItemToDelete(null);
        }
    };
    
    const handleDesativar = async (material: MaterialItem) => {
        try {
            const response = await materiaisService.updateMaterial(material.id, {
                ativo: false
            });
            if (response.success) {
                toast.success('Material desativado com sucesso!', {
                    description: `O material "${material.name}" foi desativado.`,
                });
                await loadMaterials();
            } else {
                toast.error('Erro ao desativar material', {
                    description: response.error || 'Não foi possível desativar o material.',
                });
            }
        } catch (error) {
            console.error('❌ Erro ao desativar material:', error);
            toast.error('Erro ao desativar material', {
                description: 'Ocorreu um erro ao tentar desativar o material. Tente novamente.',
            });
        }
    };

    const handleAbrirHistorico = async (material: MaterialItem) => {
        setMaterialSelecionado(material);
        setHistoricoModalOpen(true);
        setLoadingHistorico(true);
        
        try {
            const response = await materiaisService.getHistoricoCompras(material.id);
            setHistoricoCompras(Array.isArray(response) ? response : []);
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            toast.error('❌ Erro ao carregar histórico de compras');
            setHistoricoCompras([]);
        } finally {
            setLoadingHistorico(false);
        }
    };

    const handleProcessarFracionamento = async () => {
        try {
            setProcessandoFracionamento(true);
            
            // Primeiro, buscar compras pendentes para mostrar ao usuário
            const comprasPendentes = await comprasService.buscarComprasComFracionamentoPendente();
            
            if (!comprasPendentes.success || !comprasPendentes.data || comprasPendentes.data.length === 0) {
                toast.info('✅ Nenhuma compra com fracionamento pendente encontrada');
                return;
            }

            setComprasFracionamentoPendentes(comprasPendentes.data);
            setModalFracionamentoPendente(true);
        } catch (error: any) {
            console.error('Erro ao buscar compras pendentes:', error);
            toast.error('❌ Erro ao buscar compras pendentes', {
                description: error.message || 'Não foi possível buscar compras com fracionamento pendente'
            });
        } finally {
            setProcessandoFracionamento(false);
        }
    };

    const handleConfirmarProcessarFracionamento = async () => {
        try {
            setProcessandoFracionamento(true);
            setModalFracionamentoPendente(false);
            
            const resultado = await comprasService.processarAtualizacoesFracionamento();
            
            if (resultado.success) {
                toast.success('✅ Fracionamento processado com sucesso!', {
                    description: `${resultado.comprasProcessadas} compra(s) processada(s), ${resultado.itensAtualizados} item(ns) atualizado(s)`
                });
                
                // Recarregar materiais para mostrar estoque atualizado
                await loadMaterials();
            } else {
                toast.error('❌ Erro ao processar fracionamento', {
                    description: resultado.error || 'Não foi possível processar as atualizações'
                });
            }
        } catch (error: any) {
            console.error('Erro ao processar fracionamento:', error);
            toast.error('❌ Erro ao processar fracionamento', {
                description: error.message || 'Ocorreu um erro inesperado'
            });
        } finally {
            setProcessandoFracionamento(false);
            setComprasFracionamentoPendentes([]);
        }
    };


    const handleAtualizarSKUsENCMs = async () => {
        try {
            setAtualizandoSKUs(true);
            const response = await materiaisService.atualizarSKUsENCMs();
            
            if (response.success && response.data) {
                const { materiaisAtualizados, skusGerados, ncmsAtualizados, totalMateriais } = response.data.data || {};
                toast.success('✅ SKUs e NCMs atualizados com sucesso!', {
                    description: `Atualizados ${materiaisAtualizados || 0} de ${totalMateriais || 0} materiais. ${skusGerados || 0} SKUs gerados, ${ncmsAtualizados || 0} NCMs atualizados.`,
                    duration: 5000,
                });
                // Recarregar materiais para mostrar as atualizações
                await loadMaterials();
            } else {
                toast.error('❌ Erro ao atualizar SKUs e NCMs', {
                    description: response.error || 'Ocorreu um erro ao processar a atualização.',
                });
            }
        } catch (error: any) {
            console.error('Erro ao atualizar SKUs e NCMs:', error);
            toast.error('❌ Erro ao atualizar SKUs e NCMs', {
                description: error.message || 'Ocorreu um erro inesperado.',
            });
        } finally {
            setAtualizandoSKUs(false);
        }
    };

    const handleCorrigirNomesGenericos = async () => {
        setShowCorrigirNomesDialog(false);
        
        try {
            setLoading(true);
            const response = await materiaisService.corrigirNomesGenericos();
            
            if ((response as any)?.success) {

                const corrigidos = (response as any).corrigidos || 0;
                toast.success('Nomes corrigidos com sucesso!', {
                    description: `${corrigidos} material(is) atualizado(s) com os nomes reais das notas fiscais.`,
                    duration: 5000,
                });
                await loadMaterials(); // Recarregar lista
            } else {
                toast.error('Erro ao atualizar nomes dos materiais', {
                    description: 'Não foi possível atualizar os nomes. Tente novamente.',
                });
            }
        } catch (error) {
            console.error('Erro ao corrigir nomes:', error);
            toast.error('Erro ao atualizar nomes dos materiais', {
                description: 'Ocorreu um erro ao tentar atualizar os nomes. Tente novamente.',
            });
        } finally {
            setLoading(false);
        }
    };

    // Exportar materiais críticos em PDF - abre em nova aba com botão imprimir
    const gerarPDFMateriaisCriticos = async (incluirFornecedor: boolean = true) => {
        try {
            // Buscar materiais críticos (estoque zerado ou abaixo do mínimo)
            const materiaisCriticos = materials.filter(m => 
                m.stock === 0 || m.stock <= m.minStock
            );

            if (materiaisCriticos.length === 0) {
                toast.warning('Não há materiais críticos para exportar', {
                    description: 'Não existem materiais com estoque zerado ou abaixo do mínimo.',
                });
                return;
            }

            // Criar relatório em HTML para impressão (igual ao dashboard)
            const relatorioWindow = window.open('', '_blank');
            
            if (!relatorioWindow) {
                toast.error('Bloqueador de pop-ups ativado', {
                    description: 'Permita pop-ups para gerar o relatório.',
                });
                return;
            }
            
            // Construir cabeçalho da tabela
            const cabecalhoTabela = `
                <tr>
                    <th>SKU</th>
                    <th>Material</th>
                    <th>Categoria</th>
                    <th>Unidade</th>
                    <th>Estoque</th>
                    <th>Mínimo</th>
                    <th>Preço Compra</th>
                    <th>Valor Venda</th>
                    ${incluirFornecedor ? '<th>Fornecedor</th>' : ''}
                </tr>
            `;
            
            // Construir linhas da tabela
            const linhasTabela = materiaisCriticos.map(material => {
                const valorVenda = getValorVendaExibicao(material);
                const valorVendaTexto = valorVenda.secundario && valorVenda.secundario > 0
                    ? `R$ ${valorVenda.principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/m<br/>R$ ${valorVenda.secundario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/cm`
                    : `R$ ${valorVenda.principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${valorVenda.unidade === 'm' ? '/m' : ''}`;
                
                return `
                <tr>
                    <td>${material.sku || 'N/A'}</td>
                    <td>${material.name || ''}</td>
                    <td>${material.type || material.category || ''}</td>
                    <td>${material.unitOfMeasure || 'UN'}</td>
                    <td>${material.stock}</td>
                    <td>${material.minStock}</td>
                    <td>R$ ${(material.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td>${valorVendaTexto}</td>
                    ${incluirFornecedor ? `<td>${material.supplierName || material.supplier?.name || 'N/A'}</td>` : ''}
                </tr>
            `;
            }).join('');
            
            const html = `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Relatório de Materiais Críticos - S3E Engenharia</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body {
                            font-family: 'Segoe UI', Arial, sans-serif;
                            padding: 40px;
                            background: #fff;
                            color: #333;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 40px;
                            padding-bottom: 20px;
                            border-bottom: 3px solid #10B981;
                        }
                        .header h1 {
                            color: #10B981;
                            font-size: 32px;
                            margin-bottom: 10px;
                        }
                        .header p {
                            color: #666;
                            font-size: 14px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                        }
                        table th, table td {
                            padding: 12px;
                            text-align: left;
                            border-bottom: 1px solid #E5E7EB;
                        }
                        table th {
                            background: #F3F4F6;
                            font-weight: 600;
                            color: #374151;
                        }
                        table tr:hover {
                            background: #F9FAFB;
                        }
                        .footer {
                            margin-top: 50px;
                            padding-top: 20px;
                            border-top: 2px solid #E5E7EB;
                            text-align: center;
                            color: #666;
                            font-size: 12px;
                        }
                        @media print {
                            body { padding: 20px; }
                            .no-print { display: none; }
                        }
                        .print-button {
                            padding: 12px 24px;
                            background: #3B82F6;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: 600;
                            margin: 20px auto;
                            display: block;
                        }
                        .print-button:hover {
                            background: #2563EB;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>⚡ S3E Engenharia</h1>
                        <p>Relatório de Materiais Críticos</p>
                        <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                    </div>
                    
                    <div class="section">
                        <h2>Materiais com Estoque Crítico</h2>
                        <p style="margin-bottom: 15px; color: #666;">Total de materiais: ${materiaisCriticos.length}</p>
                        <table>
                            <thead>
                                ${cabecalhoTabela}
                            </thead>
                            <tbody>
                                ${linhasTabela}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="footer">
                        <p>Relatório gerado pelo sistema S3E Engenharia</p>
                        <p class="no-print" style="margin-top: 20px;">
                            <button onclick="window.print()" class="print-button">
                                🖨️ Imprimir / Salvar PDF
                            </button>
                        </p>
                    </div>
                </body>
                </html>
            `;
            
            relatorioWindow.document.write(html);
            relatorioWindow.document.close();
            
            toast.success('Relatório gerado com sucesso!', {
                description: `${materiaisCriticos.length} material(is) crítico(s) exportado(s).`,
            });

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            toast.error('Erro ao gerar relatório', {
                description: 'Não foi possível gerar o relatório. Tente novamente.',
            });
        }
    };

    const handleExportarPDF = async () => {
        try {
            setMenuExportarOpen(false);
            setShowDialogFornecedor(true);
        } catch (error) {
            console.error('Erro ao exportar:', error);
        }
    };

    const handleConfirmarExportacaoPDF = (incluirFornecedor: boolean) => {
        setShowDialogFornecedor(false);
        gerarPDFMateriaisCriticos(incluirFornecedor);
    };

    // Importar preços atualizados
    const handleImportar = async () => {
        if (!arquivoImportar) {

            toast.warning('Nenhum arquivo selecionado', {
                description: 'Por favor, selecione um arquivo XLSX ou CSV para importar.',
            });
            return;
        }

        const extensao = arquivoImportar.name.split('.').pop()?.toLowerCase();
        if (!['xlsx', 'csv'].includes(extensao || '')) {

            toast.error('Formato de arquivo inválido', {
                description: 'Apenas arquivos XLSX ou CSV são permitidos. Selecione um arquivo válido.',
            });
            return;
        }

        try {
            setProcessandoImportacao(true);
            
            const formData = new FormData();
            formData.append('arquivo', arquivoImportar);

            const response = await materiaisService.importarPrecos(formData);
            
            console.log('📥 Resposta da importação:', response);
            
            if (response.success) {
                const atualizados = response.data?.atualizados || 0;
                const erros = response.data?.erros || 0;
                const total = response.data?.total || 0;
                
                if (atualizados > 0) {

                    toast.success('Preços atualizados com sucesso!', {
                        description: `${atualizados} de ${total} preço(s) atualizado(s).${erros > 0 ? ` ${erros} erro(s) encontrado(s).` : ''}`,
                        duration: 5000,
                    });
                    await loadMaterials(); // Recarregar lista
                    setModalImportarOpen(false);
                    setArquivoImportar(null);
                } else {

                    toast.warning('Nenhum preço foi atualizado', {
                        description: erros > 0 ? `${erros} erro(s) encontrado(s). Verifique o arquivo e tente novamente.` : 'Nenhum registro válido encontrado no arquivo.',
                        duration: 5000,
                    });
                }
            } else {
                toast.error(response.error || '❌ Erro ao importar arquivo');
            }
        } catch (error: any) {
            console.error('Erro ao importar preços:', error);
            toast.error('❌ Erro ao processar arquivo');
        } finally {
            setProcessandoImportacao(false);
        }
    };

    // Funções de Exportação/Importação JSON
    const handleExportTemplate = () => {
        try {
            setMenuExportarOpen(false);
            const template = generateExampleTemplate('materiais');
            exportToJSON(template, `template_materiais_${new Date().toISOString().split('T')[0]}.json`);
            toast.success('✅ Template exportado com sucesso!');
        } catch (error) {
            console.error('Erro ao exportar template:', error);
            toast.error('❌ Erro ao exportar template');
        }
    };

    const handleExportJSON = () => {
        try {
            setMenuExportarOpen(false);
            const template: ImportExportData = {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                materiais: materials.map(material => ({
                    sku: material.sku, // ✅ Usar sku
                    codigo: material.sku, // Manter para compatibilidade
                    descricao: material.name,
                    nome: material.name, // ✅ Incluir nome também
                    unidadeMedida: material.unitOfMeasure, // ✅ Usar unidadeMedida
                    unidade: material.unitOfMeasure, // Manter para compatibilidade
                    preco: material.price || 0,
                    estoque: material.stock,
                    estoqueMinimo: material.minStock,
                    categoria: material.type || material.category,
                    tipo: material.type, // ✅ Incluir tipo também
                    fornecedorId: material.supplierId,
                    fornecedorNome: material.supplierName || material.supplier?.name,
                    ativo: material.ativo !== false,
                })),
            };
            exportToJSON(template, `materiais_export_${new Date().toISOString().split('T')[0]}.json`);
            toast.success(`✅ ${materials.length} material(is) exportado(s) com sucesso!`);
        } catch (error) {
            console.error('Erro ao exportar materiais:', error);
            toast.error('❌ Erro ao exportar materiais');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

            if (!data.materiais || data.materiais.length === 0) {
                toast.error('❌ O arquivo não contém materiais para importar');
                return;
            }

            let successCount = 0;
            let errorCount = 0;

            // Importar cada material
            for (const materialTemplate of data.materiais) {
                try {
                    // Buscar fornecedor por nome se não tiver ID
                    let fornecedorId = materialTemplate.fornecedorId;
                    if (!fornecedorId && materialTemplate.fornecedorNome) {
                        // Aqui você precisaria buscar o fornecedor pelo nome
                        // Por enquanto, deixamos como opcional
                        console.warn(`Fornecedor não encontrado: ${materialTemplate.fornecedorNome}`);
                    }

                    // Criar material
                    const materialData = {
                        sku: materialTemplate.sku || materialTemplate.codigo, // ✅ Usar sku, com fallback para codigo
                        nome: materialTemplate.nome || materialTemplate.descricao, // ✅ Incluir nome
                        descricao: materialTemplate.descricao,
                        unidadeMedida: materialTemplate.unidadeMedida || materialTemplate.unidade || 'un', // ✅ Usar unidadeMedida, com fallback
                        preco: materialTemplate.preco,
                        estoque: materialTemplate.estoque,
                        estoqueMinimo: materialTemplate.estoqueMinimo || 5,
                        categoria: materialTemplate.categoria,
                        tipo: materialTemplate.tipo || materialTemplate.categoria, // ✅ Incluir tipo
                        fornecedorId,
                    };

                    const response = await materiaisService.createMaterial(materialData);
                    if (response.success) {
                        successCount++;
                    } else {
                        errorCount++;
                        console.error('Erro ao criar material:', response.error || response.message);
                    }
                } catch (error) {
                    errorCount++;
                    console.error('Erro ao importar material:', error);
                }
            }

            // Limpar input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }


            if (successCount > 0) {
                toast.success('Importação concluída!', {
                    description: `${successCount} material(is) importado(s) com sucesso.${errorCount > 0 ? ` ${errorCount} erro(s) encontrado(s).` : ''}`,
                    duration: 5000,
                });
            } else {
                toast.error('Nenhum material foi importado', {
                    description: errorCount > 0 ? `${errorCount} erro(s) encontrado(s). Verifique o arquivo e tente novamente.` : 'Nenhum registro válido encontrado no arquivo.',
                    duration: 5000,
                });
            }
            await loadMaterials(); // Recarregar lista
        } catch (error) {
            console.error('Erro ao importar arquivo:', error);
            toast.error('Erro ao importar arquivo', {
                description: error instanceof Error ? error.message : 'Ocorreu um erro ao tentar importar o arquivo. Tente novamente.',
            });
        } finally {
            setImporting(false);
        }
    };

    const getStockStatusClass = (material: MaterialItem) => {
        if (material.stock === 0) {
            return 'bg-red-100 text-red-800 ring-1 ring-red-200';
        } else if (material.stock <= material.minStock) {
            return 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200';
        }
        return 'bg-green-100 text-green-800 ring-1 ring-green-200';
    };

    const getStockStatusText = (material: MaterialItem) => {
        if (material.stock === 0) {
            return '❌ Esgotado';
        } else if (material.stock <= material.minStock) {
            return '⚠️ Baixo';
        }
        return '✅ Normal';
    };

    const getCategoryIcon = (category: MaterialCategory) => {
        switch (category) {
            case MaterialCategory.ELETRICO:
                return '⚡';
            case MaterialCategory.FERRAMENTA:
                return '🔧';
            case MaterialCategory.OUTRO:
                return '📦';
            default:
                return '📦';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Carregando estoque...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-white dark:hover:bg-gray-800 hover:shadow-soft">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">Estoque</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">Gerencie materiais e controle de estoque</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleAtualizarSKUsENCMs}
                        disabled={atualizandoSKUs}
                        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-medium font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Gerar SKUs únicos e atualizar NCMs de materiais existentes"
                    >
                        {atualizandoSKUs ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Atualizando...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Atualizar SKUs/NCMs
                            </>
                        )}
                    </button>
                    <button

                        onClick={() => setShowCorrigirNomesDialog(true)}
                        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-medium font-semibold"
                        title="Atualizar nomes de produtos importados via XML"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Atualizar Nomes
                    </button>
                    
                    {/* Botões de Exportação */}
                    <div className="relative group">
                        <button
                            onClick={() => setMenuExportarOpen(!menuExportarOpen)}
                            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-medium font-semibold"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Exportar
                        </button>
                        
                        {/* Menu Dropdown */}
                        {menuExportarOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-card rounded-xl shadow-2xl border border-gray-200 dark:border-dark-border z-50 py-2 animate-fade-in">
                                <button
                                    onClick={handleExportarPDF}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
                                >
                                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-dark-text">PDF (.pdf)</p>
                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Visualização impressa</p>
                                    </div>
                                </button>
                                <div className="border-t border-gray-200 dark:border-dark-border my-2"></div>
                                <button
                                    onClick={handleExportTemplate}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
                                >
                                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-dark-text">Template JSON</p>
                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Exportar template</p>
                                    </div>
                                </button>
                                <button
                                    onClick={handleExportJSON}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
                                >
                                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-dark-text">Exportar JSON</p>
                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Todos os materiais</p>
                                    </div>
                                </button>
                                <button
                                    onClick={handleImportClick}
                                    disabled={importing}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3 disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-dark-text">{importing ? 'Importando...' : 'Importar JSON'}</p>
                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Importar materiais</p>
                                    </div>
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json"
                                    onChange={handleImportJSON}
                                    style={{ display: 'none' }}
                                />
                                <div className="border-t border-gray-200 dark:border-dark-border my-2"></div>
                                <button
                                    onClick={() => setModalImportarOpen(true)}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
                                >
                                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-dark-text">Importar Preços</p>
                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Atualizar valores</p>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl hover:from-teal-700 hover:to-teal-600 transition-all shadow-medium font-semibold"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Novo Material
                    </button>
                    
                    {/* Botão de Atualizar Fracionamento */}
                    <button
                        onClick={handleProcessarFracionamento}
                        disabled={processandoFracionamento}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-xl hover:from-blue-700 hover:to-indigo-600 transition-all shadow-medium font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Atualizar estoque com base em fracionamentos configurados nas compras"
                    >
                        {processandoFracionamento ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Processando...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Atualizar Fracionamento
                            </>
                        )}
                    </button>
                </div>
            </header>

            {/* Error Message */}
            {error && (
                <Alert variant="destructive" className="mb-6 animate-fade-in">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 flex items-center justify-center">
                            <CubeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Itens</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalItems}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 flex items-center justify-center">
                            <ExclamationTriangleIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Estoque Baixo</p>
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.lowStock}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/50 flex items-center justify-center">
                            <XMarkIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Esgotados</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.outOfStock}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 flex items-center justify-center">
                            <span className="text-2xl">💰</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Valor Total</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                R$ {stats.totalValue.toLocaleString('pt-BR')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-soft border border-gray-100 dark:border-gray-700 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, SKU ou tipo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 focus:border-teal-500 dark:focus:border-teal-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value as MaterialCategory | 'Todos')}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="Todos">Todas as Categorias</option>
                            <option value={MaterialCategory.ELETRICO}>Material Elétrico</option>
                            <option value={MaterialCategory.FERRAMENTA}>Ferramentas</option>
                            <option value={MaterialCategory.SEGURANCA}>Segurança</option>
                            <option value={MaterialCategory.OUTRO}>Outros</option>
                        </select>
                    </div>

                    <div>
                        <select
                            value={stockFilter}
                            onChange={(e) => setStockFilter(e.target.value as 'Todos' | 'Baixo' | 'Zerado')}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="Todos">Todos os Estoques</option>
                            <option value="Baixo">Estoque Baixo</option>
                            <option value="Zerado">Esgotados</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Exibindo <span className="font-bold text-gray-900 dark:text-white">{filteredMaterials.length}</span> de <span className="font-bold text-gray-900 dark:text-white">{materials.length}</span> materiais
                    </p>
                    <div className="flex items-center gap-4">
                        <ViewToggle view={viewMode} onViewChange={handleViewModeChange} />
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full"></div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">Normal: {materials.filter(m => m.stock > m.minStock).length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 dark:bg-yellow-400 rounded-full"></div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">Baixo: {stats.lowStock}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 dark:bg-red-400 rounded-full"></div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">Esgotado: {stats.outOfStock}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid de Materiais */}
            {filteredMaterials.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-gray-100 dark:border-gray-700 p-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">📦</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Nenhum material encontrado</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {searchTerm || categoryFilter !== 'Todos' || stockFilter !== 'Todos'
                            ? 'Tente ajustar os filtros de busca'
                            : 'Comece adicionando seus primeiros materiais'}
                    </p>
                    {!searchTerm && categoryFilter === 'Todos' && stockFilter === 'Todos' && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-gradient-to-r from-teal-600 to-teal-500 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-teal-600 transition-all shadow-medium font-semibold"
                        >
                            <PlusIcon className="w-5 h-5 inline mr-2" />
                            Adicionar Primeiro Material
                        </button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMaterials.map((material) => (
                        <div key={material.id} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-soft hover:shadow-medium hover:border-teal-300 dark:hover:border-teal-600 transition-all duration-200">
                            {/* Imagem do Material - Sempre visível */}
                            <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center overflow-hidden">
                                {material.imagemUrl ? (
                                    <img
                                        src={getUploadUrl(material.imagemUrl)}
                                        alt={material.name || 'Material'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const imgElement = e.target as HTMLImageElement;
                                            imgElement.style.display = 'none';
                                            const placeholder = document.createElement('div');
                                            placeholder.className = 'w-full h-full flex items-center justify-center';
                                            placeholder.innerHTML = '<svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                                            imgElement.parentElement?.appendChild(placeholder);
                                        }}
                                    />
                                ) : (
                                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </div>
                            
                            {/* Conteúdo do Card */}
                            <div className="p-6">
                            {/* Header do Card */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">

                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 line-clamp-2" title={material.name || ''}>
                                        {(material.name || '').includes('Produto importado via XML') 
                                            ? material.description || material.name || 'Sem nome'
                                            : material.name || 'Sem nome'}
                                    </h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-3 py-1 text-xs font-bold rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 ring-1 ring-teal-200 dark:ring-teal-700">
                                            {getCategoryIcon(material.category)} {material.category}
                                        </span>
                                        <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded font-mono">

                                            {material.sku || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                                <span className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${getStockStatusClass(material)}`}>
                                    {getStockStatusText(material)}
                                </span>
                            </div>

                            {/* Informações Principais */}
                            <div className="space-y-3 mb-4">
                                {/* Fornecedor - Destaque */}
                                {material.supplier && (
                                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span>🏭</span>
                                            <div className="flex-1">
                                                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Fornecedor</p>
                                                <p className="font-bold text-blue-900 dark:text-blue-300 truncate">{material.supplier.name}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Localização - Destaque */}
                                {material.location && (
                                    <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span>📍</span>
                                            <div className="flex-1">
                                                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Localização</p>
                                                <p className="font-bold text-purple-900 dark:text-purple-300">{material.location}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Grid de Métricas */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                                        <p className="text-xs text-gray-600 dark:text-gray-400">📊 Quantidade</p>
                                        <p className="font-bold text-gray-900 dark:text-white">
                                            {material.stock} <span className="text-xs text-gray-500 dark:text-gray-400">{material.unitOfMeasure}</span>
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Mín: {material.minStock}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                                        <p className="text-xs text-gray-600 dark:text-gray-400">💰 Valor Unit.</p>
                                        <p className="font-bold text-blue-700 dark:text-blue-400">
                                            R$ {(material.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Última compra</p>
                                    </div>
                                </div>
                                
                                {/* Valor de Venda */}
                                <div className="bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-lg p-2 mt-2">
                                    {(() => {
                                        const valorVenda = getValorVendaExibicao(material);
                                        return (
                                            <>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">💵 Valor de Venda:</span>
                                                    <span className="font-bold text-teal-700 dark:text-teal-400">
                                                        R$ {valorVenda.principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        {valorVenda.unidade === 'm' && <span className="text-xs ml-1">/m</span>}
                                                    </span>
                                                </div>
                                                {valorVenda.secundario && valorVenda.secundario > 0 && (
                                                    <div className="flex justify-between items-center mt-1">
                                                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">💵 Venda em cm:</span>
                                                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                                                            R$ {valorVenda.secundario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/cm
                                                        </span>
                                                    </div>
                                                )}
                                                {!valorVenda.temValor && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Usando preço de compra</p>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Valor Total em Estoque */}
                            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3 rounded-xl mb-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-green-700 dark:text-green-400">💵 Valor Investido:</span>
                                    <span className="font-bold text-green-700 dark:text-green-400 text-lg">
                                        R$ {(material.stock * (material.price || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => {
                                        setMaterialParaVisualizar(material);
                                        setViewModalOpen(true);
                                    }}
                                    className="flex items-center justify-center gap-1 px-3 py-2 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/70 transition-colors text-sm font-semibold"
                                    title="Visualizar detalhes do material"
                                >
                                    <EyeIcon className="w-4 h-4" />
                                    Ver
                                </button>
                                <button
                                    onClick={() => handleAbrirHistorico(material)}
                                    className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/70 transition-colors text-sm font-semibold"
                                    title="Ver histórico de compras e preços"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Histórico
                                </button>
                                <button
                                    onClick={() => handleOpenModal(material)}
                                    className="flex items-center justify-center gap-1 px-3 py-2 bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 rounded-lg hover:bg-teal-200 dark:hover:bg-teal-900/70 transition-colors text-sm font-semibold"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    Editar
                                </button>
                                {isAdminOrDev ? (
                                    <button
                                        onClick={() => handleOpenDeleteDialog(material)}
                                        className="flex items-center justify-center gap-1 px-3 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors text-sm font-semibold"
                                        title="Excluir material permanentemente (apenas admin/desenvolvedor)"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        Excluir
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleOpenDeleteDialog(material)}
                                        className="flex items-center justify-center gap-1 px-3 py-2 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/70 transition-colors text-sm font-semibold"
                                        title="Desativar material"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        Desativar
                                    </button>
                                )}
                            </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Visualização em Lista */
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-soft">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-b border-gray-200 dark:border-gray-600">
                            <tr>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Foto</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Material</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">SKU</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Categoria</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Estoque</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Preço Compra</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Valor Venda</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Fornecedor</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Status</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredMaterials.map((material) => (
                                <tr key={material.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 text-center">
                                        {material.imagemUrl ? (
                                            <img
                                                src={getUploadUrl(material.imagemUrl)}
                                                alt={material.name || 'Material'}
                                                className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-600 mx-auto"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto">
                                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-gray-900 dark:text-white">

                                            {(material.name || '').includes('Produto importado via XML') 
                                                ? material.description || material.name || 'Sem nome'
                                                : material.name || 'Sem nome'}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{material.type || 'Sem tipo'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded font-mono">
                                            {material.sku || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 text-xs font-bold rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300">
                                            {getCategoryIcon(material.category)} {material.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="font-bold text-gray-900 dark:text-white">
                                            {material.stock} <span className="text-xs text-gray-500">{material.unitOfMeasure}</span>
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Mín: {material.minStock}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                                            R$ {(material.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {(() => {
                                            const valorVenda = getValorVendaExibicao(material);
                                            return (
                                                <>
                                                    <p className="text-lg font-bold text-teal-700 dark:text-teal-400">
                                                        R$ {valorVenda.principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        {valorVenda.unidade === 'm' && <span className="text-xs text-gray-500 ml-1">/m</span>}
                                                    </p>
                                                    {valorVenda.secundario && valorVenda.secundario > 0 && (
                                                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                                            R$ {valorVenda.secundario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/cm
                                                        </p>
                                                    )}
                                                    {!valorVenda.temValor && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Sem valor de venda</p>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                            {material.supplier?.name || '-'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${getStockStatusClass(material)}`}>
                                            {getStockStatusText(material)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setMaterialParaVisualizar(material);
                                                    setViewModalOpen(true);
                                                }}
                                                className="p-2 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 transition-colors"
                                                title="Visualizar"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleAbrirHistorico(material)}
                                                className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition-colors"
                                                title="Histórico"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleOpenModal(material)}
                                                className="p-2 bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 rounded-lg hover:bg-teal-200 transition-colors"
                                                title="Editar"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            {isAdminOrDev ? (
                                                <button
                                                    onClick={() => handleOpenDeleteDialog(material)}
                                                    className="p-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 transition-colors"
                                                    title="Excluir material permanentemente (apenas admin/desenvolvedor)"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleOpenDeleteDialog(material)}
                                                    className="p-2 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 transition-colors"
                                                    title="Desativar material"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
                        {/* Header */}
                        <div className="modal-header bg-gradient-to-r from-teal-50 to-blue-50 dark:from-slate-800 dark:to-slate-900">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-medium ring-2 ring-teal-100 dark:ring-teal-900/50">
                                    {itemToEdit ? <PencilIcon className="w-7 h-7 text-white" /> : <PlusIcon className="w-7 h-7 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                                        {itemToEdit ? 'Editar Material' : 'Novo Material'}
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                                        {itemToEdit ? 'Atualize as informações do material' : 'Adicione um novo material ao estoque'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="absolute top-4 right-4 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-xl transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-body space-y-6">
                            {/* Informações Básicas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Nome do Material *
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.name}
                                        onChange={(e) => setFormState({...formState, name: e.target.value})}
                                        required
                                        className="input-field"
                                        placeholder="Ex: Cabo Flexível 2,5mm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        SKU
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.sku}
                                        onChange={(e) => setFormState({...formState, sku: e.target.value})}
                                        className="input-field"
                                        placeholder="Ex: CAB-2.5-FLEX"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Tipo
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.type}
                                        onChange={(e) => setFormState({...formState, type: e.target.value})}
                                        className="input-field"
                                        placeholder="Ex: Cabo, Disjuntor, Tomada"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Categoria *
                                    </label>
                                    <select
                                        value={formState.category}
                                        onChange={(e) => setFormState({...formState, category: e.target.value as MaterialCategory})}
                                        required
                                        className="select-field"
                                    >
                                        <option value={MaterialCategory.ELETRICO}>Material Elétrico</option>
                                        <option value={MaterialCategory.FERRAMENTA}>Ferramentas</option>
                                        <option value={MaterialCategory.SEGURANCA}>Segurança</option>
                                        <option value={MaterialCategory.OUTRO}>Outros</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Unidade de Medida *
                                    </label>
                                    <select
                                        value={formState.unitOfMeasure}
                                        onChange={(e) => setFormState({...formState, unitOfMeasure: e.target.value})}
                                        required
                                        className="select-field"
                                    >
                                        <option value="un">Unidade</option>
                                        <option value="m">Metro</option>
                                        <option value="kg/m">KG/M</option>
                                        <option value="kg">Quilograma</option>
                                        <option value="l">Litro</option>
                                        <option value="cx">Caixa</option>
                                        <option value="pç">Peça</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Descrição
                                    </label>
                                    <textarea
                                        value={formState.description}
                                        onChange={(e) => setFormState({...formState, description: e.target.value})}
                                        rows={3}
                                        className="textarea-field"
                                        placeholder="Descrição detalhada do material..."
                                    />
                                </div>

                                {/* Campo de Upload de Imagem */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        📷 Imagem do Material
                                    </label>
                                    
                                    {/* Preview da imagem */}
                                    {(previewImagem || (itemToEdit?.imagemUrl)) && (
                                        <div className="mb-4 relative inline-block">
                                            <img
                                                src={previewImagem || getUploadUrl(itemToEdit?.imagemUrl || '')}
                                                alt="Preview"
                                                className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleRemoverImagem}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}

                                    {/* Input de upload */}
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            onChange={handleImagemChange}
                                            className="hidden"
                                            id="imagem-material"
                                        />
                                        <label
                                            htmlFor="imagem-material"
                                            className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            Escolher Imagem
                                        </label>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {imagemSelecionada ? imagemSelecionada.name : 'JPG, PNG ou WEBP (máx. 5MB)'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Estoque e Preço */}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Estoque Atual *
                                    </label>
                                    <input
                                        type="number"
                                        value={formState.stock}
                                        onChange={(e) => setFormState({...formState, stock: e.target.value})}
                                        required
                                        min="0"
                                        step="0.01"
                                        className="input-field"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Estoque Mínimo *
                                    </label>
                                    <input
                                        type="number"
                                        value={formState.minStock}
                                        onChange={(e) => setFormState({...formState, minStock: e.target.value})}
                                        required
                                        min="0"
                                        step="0.01"
                                        className="input-field"
                                        placeholder="5"
                                    />
                                </div>


                                <div className="flex items-end">
                                    <div className="w-full bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 p-3 rounded-xl">
                                        <p className="text-sm font-medium text-teal-800 dark:text-teal-300">Valor Total em Estoque:</p>
                                        <p className="text-lg font-bold text-teal-900 dark:text-teal-200">
                                            R$ {((parseFloat(formState.stock) || 0) * (parseFloat(formState.price) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>


                            {/* Preços: Custo, Venda e Lucro */}
                            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
                                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4">💲 Informações de Preço</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                            Preço de Custo (R$) *
                                            <span className="text-xs text-gray-500 dark:text-dark-text-secondary font-normal block mt-1">Última compra</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={formState.price}
                                            onChange={(e) => {
                                                const novoPreco = e.target.value;
                                                const precoNum = parseFloat(novoPreco) || 0;
                                                
                                                // Calcular custoCM automaticamente se unidade for M ou KG/M
                                                let novoCustoCM = formState.custoCM;
                                                if ((formState.unitOfMeasure === 'm' || formState.unitOfMeasure === 'kg/m') && precoNum > 0) {
                                                    novoCustoCM = (precoNum / 100).toFixed(2);
                                                }
                                                
                                                const valorVenda = parseFloat(formState.valorVenda) || 0;
                                                const novaPorcentagem = valorVenda > 0 && precoNum > 0
                                                    ? calcularPorcentagemLucro(precoNum, valorVenda)
                                                    : 0;
                                                setFormState({
                                                    ...formState,
                                                    price: novoPreco,
                                                    custoCM: novoCustoCM,
                                                    porcentagemLucro: novaPorcentagem.toFixed(2)
                                                });
                                            }}
                                            required
                                            min="0"
                                            step="0.01"
                                            className="input-field"
                                            placeholder="0,00"
                                        />
                                    </div>

                                    {/* Custo por Centímetro - Mostrar apenas para M ou KG/M */}
                                    {(formState.unitOfMeasure === 'm' || formState.unitOfMeasure === 'kg/m') && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                Custo por Centímetro (R$/cm)
                                                <span className="text-xs text-gray-500 dark:text-dark-text-secondary font-normal block mt-1">Calculado automaticamente (Custo / 100)</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={formState.custoCM}
                                                readOnly
                                                min="0"
                                                step="0.01"
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl bg-gray-50 dark:bg-gray-800 cursor-not-allowed text-gray-700 dark:text-dark-text"
                                                placeholder="0,00"
                                            />
                                        </div>
                                    )}

                                    {/* Valor de Venda - Mostrar campos diferentes baseado na unidade */}
                                    {(formState.unitOfMeasure === 'm' || formState.unitOfMeasure === 'kg/m') ? (
                                        <>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                    Valor de Venda em Metro (R$/m)
                                                    <span className="text-xs text-gray-500 dark:text-dark-text-secondary font-normal block mt-1">Usado quando vender em metros</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    value={formState.valorVendaM}
                                                    onChange={(e) => {
                                                        const novoValorVendaM = e.target.value;
                                                        const valorVendaMNum = parseFloat(novoValorVendaM) || 0;
                                                        
                                                        // Calcular valorVendaCM automaticamente (dividir por 100)
                                                        const novoValorVendaCM = valorVendaMNum > 0 
                                                            ? (valorVendaMNum / 100).toFixed(2) 
                                                            : '';
                                                        
                                                        const precoCusto = parseFloat(formState.price) || 0;
                                                        const novaPorcentagem = precoCusto > 0 && valorVendaMNum > 0
                                                            ? calcularPorcentagemLucro(precoCusto, valorVendaMNum)
                                                            : 0;
                                                        setFormState({
                                                            ...formState,
                                                            valorVendaM: novoValorVendaM,
                                                            valorVendaCM: novoValorVendaCM,
                                                            porcentagemLucro: novaPorcentagem.toFixed(2)
                                                        });
                                                    }}
                                                    min="0"
                                                    step="0.01"
                                                    className="input-field"
                                                    placeholder="0,00"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                    Valor de Venda em Centímetro (R$/cm)
                                                    <span className="text-xs text-gray-500 dark:text-dark-text-secondary font-normal block mt-1">Usado quando vender em centímetros</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    value={formState.valorVendaCM}
                                                    onChange={(e) => {
                                                        const novoValorVendaCM = e.target.value;
                                                        const precoCusto = parseFloat(formState.price) || 0;
                                                        // Para CM, calcular porcentagem baseado no valor em CM * 100 (equivalente a 1 metro)
                                                        const valorCMEmMetro = parseFloat(novoValorVendaCM) * 100;
                                                        const novaPorcentagem = precoCusto > 0 && valorCMEmMetro > 0
                                                            ? calcularPorcentagemLucro(precoCusto, valorCMEmMetro)
                                                            : 0;
                                                        setFormState({
                                                            ...formState,
                                                            valorVendaCM: novoValorVendaCM,
                                                            porcentagemLucro: novaPorcentagem.toFixed(2)
                                                        });
                                                    }}
                                                    min="0"
                                                    step="0.01"
                                                    className="input-field"
                                                    placeholder="0,00"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                Valor de Venda (R$)
                                                <span className="text-xs text-gray-500 dark:text-dark-text-secondary font-normal block mt-1">Usado em orçamentos</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={formState.valorVenda}
                                                onChange={(e) => {
                                                    const novoValorVenda = e.target.value;
                                                    const precoCusto = parseFloat(formState.price) || 0;
                                                    const novaPorcentagem = precoCusto > 0 && parseFloat(novoValorVenda) > 0
                                                        ? calcularPorcentagemLucro(precoCusto, parseFloat(novoValorVenda) || 0)
                                                        : 0;
                                                    setFormState({
                                                        ...formState,
                                                        valorVenda: novoValorVenda,
                                                        porcentagemLucro: novaPorcentagem.toFixed(2)
                                                    });
                                                }}
                                                min="0"
                                                step="0.01"
                                                className="input-field"
                                                placeholder="0,00"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                            Porcentagem de Lucro (%)
                                            <span className="text-xs text-gray-500 dark:text-dark-text-secondary font-normal block mt-1">Calculado automaticamente</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={formState.porcentagemLucro}
                                            readOnly
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl bg-gray-50 dark:bg-gray-800 cursor-not-allowed text-gray-700 dark:text-dark-text"
                                            placeholder="0,00"
                                        />
                                        {parseFloat(formState.porcentagemLucro) > 0 && (
                                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                                                Lucro de R$ {((parseFloat(formState.valorVenda) || 0) - (parseFloat(formState.price) || 0)).toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Localização e Fornecedor */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Localização no Estoque
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.location}
                                        onChange={(e) => setFormState({...formState, location: e.target.value})}
                                        className="input-field"
                                        placeholder="Ex: Estoque A1, Prateleira 3"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Fornecedor
                                    </label>
                                    <SupplierCombobox
                                        value={formState.supplierName}
                                        onChange={(nome, supplierId) => {
                                            setFormState({
                                                ...formState,
                                                supplierName: nome,
                                                supplierId: supplierId
                                            });
                                        }}
                                        fornecedores={fornecedores}
                                        loading={loadingFornecedores}
                                        placeholder="Selecione ou digite o nome do fornecedor"
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="btn-secondary"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                >
                                    {itemToEdit ? 'Atualizar' : 'Adicionar'} Material
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AlertDialog de Confirmação de Exclusão */}
            <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
                setShowDeleteDialog(open);
                if (!open) {
                    setItemToDelete(null);
                    setMovimentacoesCount(0);
                }
            }}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {isAdminOrDev ? '🗑️ Excluir Material Permanentemente' : '⚠️ Desativar Material'}
                        </AlertDialogTitle>
                        <div className="space-y-3">
                            {isAdminOrDev ? (
                                <>
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <p className="text-sm font-semibold text-red-800 mb-2">
                                            ⚠️ ATENÇÃO: Esta ação é irreversível!
                                        </p>
                                        <p className="text-sm text-red-700">
                                            O material será excluído permanentemente do banco de dados (hard delete).
                                        </p>
                                    </div>
                                    
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                        <p className="text-sm font-semibold text-gray-800 mb-1">
                                            Material:
                                        </p>
                                        <p className="text-sm text-gray-700">
                                            <strong>"{itemToDelete?.name}"</strong>
                                        </p>
                                        {itemToDelete?.sku && (
                                            <p className="text-xs text-gray-600 mt-1">
                                                SKU: {itemToDelete.sku}
                                            </p>
                                        )}
                                    </div>

                                    {loadingMovimentacoes ? (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                            <p className="text-sm text-yellow-700">
                                                🔍 Verificando movimentações relacionadas...
                                            </p>
                                        </div>
                                    ) : movimentacoesCount > 0 ? (
                                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                            <p className="text-sm font-semibold text-orange-800 mb-1">
                                                📦 Movimentações relacionadas:
                                            </p>
                                            <p className="text-sm text-orange-700">
                                                Este material possui <strong>{movimentacoesCount} movimentação(ões)</strong> de estoque que também serão excluídas permanentemente.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <p className="text-sm text-blue-700">
                                                ℹ️ Nenhuma movimentação de estoque encontrada para este material.
                                            </p>
                                        </div>
                                    )}

                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                        <p className="text-xs text-yellow-800">
                                            <strong>Nota:</strong> O material permanecerá no histórico de compras e contas a pagar para manter a integridade dos registros financeiros.
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <AlertDialogDescription className="text-gray-700">
                                        Tem certeza que deseja desativar o material <strong>"{itemToDelete?.name}"</strong>?
                                    </AlertDialogDescription>
                                    <AlertDialogDescription className="text-sm text-gray-600">
                                        O material será desativado e não aparecerá mais nas listagens, mas permanecerá no histórico.
                                    </AlertDialogDescription>
                                </>
                            )}
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {
                            setShowDeleteDialog(false);
                            setItemToDelete(null);
                            setMovimentacoesCount(0);
                        }}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={isAdminOrDev ? handleDelete : () => {
                                if (itemToDelete) {
                                    handleDesativar(itemToDelete);
                                    setShowDeleteDialog(false);
                                    setItemToDelete(null);
                                    setMovimentacoesCount(0);
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={loading || loadingMovimentacoes}
                        >
                            {loading ? (isAdminOrDev ? 'Excluindo...' : 'Desativando...') : (isAdminOrDev ? 'Excluir Permanentemente' : 'Desativar Material')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* AlertDialog de Confirmação para Corrigir Nomes */}
            <AlertDialog open={showCorrigirNomesDialog} onOpenChange={setShowCorrigirNomesDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>📝 Corrigir Nomes dos Materiais</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deseja atualizar os nomes de todos os produtos importados via XML com os nomes reais das notas fiscais?
                            <br /><br />
                            <strong>⚠️ Esta ação não pode ser desfeita.</strong>
                            <br />
                            Todos os materiais que foram importados via XML terão seus nomes substituídos pelos nomes reais das notas fiscais.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowCorrigirNomesDialog(false)}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCorrigirNomesGenericos}
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={loading}
                        >
                            {loading ? 'Corrigindo...' : 'Corrigir Nomes'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* AlertDialog para escolher incluir ou não fornecedor no PDF */}
            <AlertDialog open={showDialogFornecedor} onOpenChange={setShowDialogFornecedor}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>📄 Exportar Relatório de Itens Críticos</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deseja incluir a coluna de fornecedor no relatório?
                            <br /><br />
                            <strong>Com Fornecedor:</strong> O relatório incluirá informações do fornecedor de cada material.
                            <br />
                            <strong>Sem Fornecedor:</strong> O relatório será gerado sem a coluna de fornecedor.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel onClick={() => setShowDialogFornecedor(false)}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => handleConfirmarExportacaoPDF(false)}
                            className="bg-gray-600 hover:bg-gray-700"
                        >
                            Sem Fornecedor
                        </AlertDialogAction>
                        <AlertDialogAction
                            onClick={() => handleConfirmarExportacaoPDF(true)}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Com Fornecedor
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* MODAL DE HISTÓRICO DE COMPRAS */}
            {historicoModalOpen && materialSelecionado && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-strong max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">Histórico de Compras</h3>
                                        <p className="text-sm text-blue-100 mt-1">{materialSelecionado.name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleFecharHistorico}
                                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Conteúdo */}
                        <div className="p-6 space-y-6">
                            {/* Informações Resumidas */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <p className="text-sm text-blue-700 mb-1">🏭 Fornecedor Atual</p>
                                    <p className="text-lg font-semibold text-blue-900">
                                        {materialSelecionado.supplier?.name || materialSelecionado.supplierName || 'Não informado'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-600 mb-1">📍 Localização</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {materialSelecionado.location || 'Não informado'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-600 mb-1">📦 Em Estoque</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {materialSelecionado.stock} {materialSelecionado.unitOfMeasure}
                                    </p>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                    <p className="text-sm text-green-700 mb-1">💰 Valor Investido</p>
                                    <p className="text-lg font-bold text-green-600">
                                        R$ {(materialSelecionado.stock * (materialSelecionado.price || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>


                            {/* Informações de Preço: Custo, Venda e Lucro */}
                            <div className="border-t border-gray-200 pt-6 mt-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">💲 Informações de Preço</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Preço de Custo</p>
                                        <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                            R$ {(materialSelecionado.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Última compra</p>
                                    </div>
                                    <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                                        <p className="text-sm text-purple-700 dark:text-purple-300 mb-1">Valor de Venda</p>
                                        {(() => {
                                            const valorVenda = getValorVendaExibicao(materialSelecionado);
                                            return (
                                                <>
                                                    <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                                                        {valorVenda.temValor 
                                                            ? `R$ ${valorVenda.principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${valorVenda.unidade === 'm' ? '/m' : ''}`
                                                            : <span className="text-gray-400">Não definido</span>
                                                        }
                                                    </p>
                                                    {valorVenda.secundario && valorVenda.secundario > 0 && (
                                                        <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                                                            R$ {valorVenda.secundario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/cm
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Usado em orçamentos</p>
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
                                        <p className="text-sm text-green-700 dark:text-green-300 mb-1">Porcentagem de Lucro</p>
                                        <p className="text-lg font-bold text-green-900 dark:text-green-100">
                                            {materialSelecionado.porcentagemLucro 
                                                ? `${materialSelecionado.porcentagemLucro.toFixed(2)}%`
                                                : materialSelecionado.valorVenda && materialSelecionado.price
                                                ? `${calcularPorcentagemLucro(materialSelecionado.price, materialSelecionado.valorVenda).toFixed(2)}%`
                                                : <span className="text-gray-400">Não calculado</span>
                                            }
                                        </p>
                                        {materialSelecionado.valorVenda && materialSelecionado.price && (
                                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                Lucro: R$ {((materialSelecionado.valorVenda - materialSelecionado.price)).toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Histórico de Compras */}
                            <div className="border-t border-gray-200 pt-6">
                                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Histórico de Compras e Preços
                                </h4>

                                {loadingHistorico ? (
                                    <div className="text-center py-12">
                                        <div className="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                        <p className="text-gray-500 mt-4">Carregando histórico...</p>
                                    </div>
                                ) : historicoCompras.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <p className="text-gray-500 font-medium">Nenhuma compra registrada</p>
                                        <p className="text-sm text-gray-400 mt-1">Este material ainda não foi comprado</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data da Compra</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">NF</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Fornecedor</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Quantidade</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Valor Unitário</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Valor Total</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {historicoCompras.map((compra, index) => (
                                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 text-sm text-gray-900">
                                                            {new Date(compra.dataCompra).toLocaleDateString('pt-BR')}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">
                                                            {compra.numeroNF}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900">
                                                            {compra.fornecedor}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                            {compra.quantidade}
                                                            {(compra as any).quantidadeFracionada && (
                                                                <span className="ml-2 text-blue-600 font-medium">
                                                                    ({compra.quantidade} {(compra as any).tipoEmbalagem?.toLowerCase() || 'embalagens'} = {compra.quantidade * (compra as any).quantidadeFracionada} unidades)
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-bold text-blue-600 text-right">
                                                            R$ {parseFloat(compra.valorUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">
                                                            R$ {parseFloat(compra.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                                                                compra.status === 'Recebido' ? 'bg-green-100 text-green-700' :
                                                                compra.status === 'Pendente' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-gray-100 text-gray-700'
                                                            }`}>
                                                                {compra.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Estatísticas do Histórico */}
                                {historicoCompras.length > 0 && (
                                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                            <p className="text-sm text-blue-700 mb-1">Última Compra</p>
                                            <p className="text-lg font-bold text-blue-900">
                                                {new Date(historicoCompras[0].dataCompra).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                            <p className="text-sm text-green-700 mb-1">Último Preço Unitário</p>
                                            <p className="text-lg font-bold text-green-600">
                                                R$ {parseFloat(historicoCompras[0].valorUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                                            <p className="text-sm text-purple-700 mb-1">Total de Compras</p>
                                            <p className="text-lg font-bold text-purple-900">
                                                {historicoCompras.length} registro(s)
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={handleFecharHistorico}
                                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE VISUALIZAÇÃO */}
            {viewModalOpen && materialParaVisualizar && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-strong max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Detalhes do Material</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Informações completas do item</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setViewModalOpen(false);
                                    setMaterialParaVisualizar(null);
                                }} 
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700 rounded-xl"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Foto do Material */}
                            {materialParaVisualizar.imagemUrl && (
                                <div className="flex items-center gap-4 mb-4">
                                    <img
                                        src={getUploadUrl(materialParaVisualizar.imagemUrl)}
                                        alt={materialParaVisualizar.name || 'Material'}
                                        className="w-[100px] h-[100px] object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">📷 Imagem do Material</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">100x100 pixels</p>
                                    </div>
                                </div>
                            )}

                            {/* Informações Principais */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Nome</h3>
                                    <p className="text-gray-900 dark:text-white font-medium">
                                        {materialParaVisualizar.name.includes('Produto importado via XML') 
                                            ? materialParaVisualizar.description || materialParaVisualizar.name 
                                            : materialParaVisualizar.name}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">SKU</h3>
                                    <p className="text-gray-900 dark:text-white font-mono font-medium">{materialParaVisualizar.sku}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">NCM</h3>
                                    <p className="text-gray-900 dark:text-white font-mono font-medium">
                                        {materialParaVisualizar.ncm || 'N/A'}
                                    </p>
                                    {materialParaVisualizar.ncm && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Nomenclatura Comum do Mercosul</p>
                                    )}
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Categoria</h3>
                                    <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 ring-1 ring-teal-200 dark:ring-teal-700">
                                        {getCategoryIcon(materialParaVisualizar.category)} {materialParaVisualizar.category}
                                    </span>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Tipo</h3>
                                    <p className="text-gray-900 dark:text-white font-medium">{materialParaVisualizar.type || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Descrição */}
                            {materialParaVisualizar.description && (
                                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Descrição</h3>
                                    <p className="text-gray-700 dark:text-gray-300">{materialParaVisualizar.description}</p>
                                </div>
                            )}

                            {/* Estoque */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">📊 Estoque Atual</h3>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                        {materialParaVisualizar.stock} <span className="text-sm text-gray-500 dark:text-gray-400">{materialParaVisualizar.unitOfMeasure}</span>
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">⚠️ Estoque Mínimo</h3>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                        {materialParaVisualizar.minStock} <span className="text-sm text-gray-500 dark:text-gray-400">{materialParaVisualizar.unitOfMeasure}</span>
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Status</h3>
                                    <span className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${getStockStatusClass(materialParaVisualizar)}`}>
                                        {getStockStatusText(materialParaVisualizar)}
                                    </span>
                                </div>
                            </div>

                            {/* Valores */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                                    <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">💰 Preço de Compra</h3>
                                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                                        R$ {(materialParaVisualizar.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 p-4 rounded-xl">
                                    <h3 className="font-semibold text-teal-800 dark:text-teal-300 mb-2">💵 Preço de Venda</h3>
                                    {(() => {
                                        const valorVenda = getValorVendaExibicao(materialParaVisualizar);
                                        return (
                                            <>
                                                <p className="text-3xl font-bold text-teal-700 dark:text-teal-400">
                                                    R$ {valorVenda.principal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    {valorVenda.unidade === 'm' && <span className="text-lg ml-1">/m</span>}
                                                </p>
                                                {valorVenda.secundario && valorVenda.secundario > 0 && (
                                                    <p className="text-xl font-semibold text-green-600 dark:text-green-400 mt-2">
                                                        R$ {valorVenda.secundario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/cm
                                                    </p>
                                                )}
                                                {!valorVenda.temValor && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Usando preço de compra</p>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-4 rounded-xl">
                                    <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">📦 Valor Total em Estoque</h3>
                                    <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                                        R$ {(materialParaVisualizar.stock * (materialParaVisualizar.price || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            {/* Fornecedor e Localização */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {materialParaVisualizar.supplier && (
                                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                                        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">🏭 Fornecedor</h3>
                                        <p className="text-lg font-bold text-blue-900 dark:text-blue-300">{materialParaVisualizar.supplier.name}</p>
                                    </div>
                                )}
                                {materialParaVisualizar.location && (
                                    <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 p-4 rounded-xl">
                                        <h3 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">📍 Localização</h3>
                                        <p className="text-lg font-bold text-purple-900 dark:text-purple-300">{materialParaVisualizar.location}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE IMPORTAÇÃO DE PREÇOS */}
            {modalImportarOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-orange-600 to-orange-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">Importar Preços Atualizados</h3>
                                        <p className="text-sm text-orange-100 mt-1">Atualização em massa de preços unitários</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setModalImportarOpen(false);
                                        setArquivoImportar(null);
                                    }}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Instruções */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">📋 Como funciona:</h4>
                                <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                                    <li className="flex gap-2">
                                        <span className="font-bold">1.</span>
                                        <span>Clique em "Exportar" e escolha XLSX ou CSV para gerar o arquivo de cotação</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-bold">2.</span>
                                        <span>Envie o arquivo para o fornecedor preencher os preços na coluna "Preço Fornecedor"</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-bold">3.</span>
                                        <span>Após receber o arquivo preenchido, importe-o aqui para atualizar os preços automaticamente</span>
                                    </li>
                                </ol>
                            </div>

                            {/* Upload de Arquivo */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">
                                    Selecionar Arquivo
                                </label>
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:border-orange-400 dark:hover:border-orange-600 transition-colors">
                                    <input
                                        type="file"
                                        id="arquivo-importar"
                                        accept=".xlsx,.csv"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setArquivoImportar(file);
                                            }
                                        }}
                                        className="hidden"
                                    />
                                    <label htmlFor="arquivo-importar" className="cursor-pointer">
                                        <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        {arquivoImportar ? (
                                            <div>
                                                <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">{arquivoImportar.name}</p>
                                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
                                                    {(arquivoImportar.size / 1024).toFixed(2)} KB
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setArquivoImportar(null);
                                                    }}
                                                    className="mt-2 text-red-600 hover:text-red-700 font-medium text-sm"
                                                >
                                                    Remover arquivo
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-lg font-semibold text-gray-700 dark:text-dark-text">
                                                    Clique para selecionar o arquivo
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary mt-1">
                                                    Arquivos XLSX ou CSV até 10MB
                                                </p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>

                            {/* Avisos Importantes */}
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                                <h4 className="font-semibold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2">
                                    <ExclamationTriangleIcon className="w-5 h-5" />
                                    Avisos Importantes
                                </h4>
                                <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
                                    <li>⚠️ O sistema identificará os materiais pelo código (SKU)</li>
                                    <li>⚠️ Apenas preços válidos serão atualizados (números maiores que zero)</li>
                                    <li>⚠️ Materiais não encontrados serão ignorados</li>
                                    <li>⚠️ Esta ação não pode ser desfeita. Faça backup se necessário</li>
                                </ul>
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleImportar}
                                    disabled={!arquivoImportar || processandoImportacao}
                                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processandoImportacao ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block mr-2"></div>
                                            Processando...
                                        </>
                                    ) : (
                                        <>🔄 Importar e Atualizar Preços</>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setModalImportarOpen(false);
                                        setArquivoImportar(null);
                                    }}
                                    disabled={processandoImportacao}
                                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Compras com Fracionamento Pendente */}
            {modalFracionamentoPendente && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-indigo-600">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-white">📦 Atualizar Estoque por Fracionamento</h3>
                                    <p className="text-sm text-blue-100 mt-1">
                                        {comprasFracionamentoPendentes.length} compra(s) com fracionamento pendente
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setModalFracionamentoPendente(false);
                                        setComprasFracionamentoPendentes([]);
                                    }}
                                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
                                    ℹ️ As seguintes compras têm itens com fracionamento configurado que ainda não foram aplicados ao estoque:
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    Ao confirmar, o estoque será atualizado com as quantidades unitárias corretas. Cada compra será processada apenas uma vez.
                                </p>
                            </div>

                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {comprasFracionamentoPendentes.map((compra: any) => (
                                    <div key={compra.id} className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    NF: {compra.numeroNF} - {compra.fornecedorNome}
                                                </p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                                    Compra #{compra.numeroSequencial} • {new Date(compra.dataCompra).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-semibold">
                                                {compra.itensPendentes.length} item(ns)
                                            </span>
                                        </div>
                                        
                                        <div className="mt-3 space-y-2">
                                            {compra.itensPendentes.map((item: any, idx: number) => (
                                                <div key={idx} className="bg-white dark:bg-dark-card rounded-lg p-3 border border-gray-200 dark:border-dark-border">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.nomeProduto}</p>
                                                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                                        <span className="font-semibold">
                                                            {item.quantidade} {item.tipoEmbalagem?.toLowerCase() || 'embalagens'} × {item.quantidadeFracionada} un = 
                                                        </span>
                                                        <span className="ml-1 text-blue-600 dark:text-blue-400 font-bold">
                                                            {item.quantidadeTotalUnidades} unidades
                                                        </span>
                                                        {item.material && (
                                                            <span className="ml-2 text-gray-500">
                                                                (Estoque atual: {item.material.estoqueAtual} un)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 dark:border-dark-border flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setModalFracionamentoPendente(false);
                                    setComprasFracionamentoPendentes([]);
                                }}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-all font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmarProcessarFracionamento}
                                disabled={processandoFracionamento}
                                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {processandoFracionamento ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Processando...
                                    </>
                                ) : (
                                    'Confirmar e Processar'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Materiais;