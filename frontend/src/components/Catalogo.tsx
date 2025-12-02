import React, { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { CatalogItem, CatalogItemType, Product, Kit, KitProduct, Service, ServiceCatalogItem, KitService, ServiceType, KitConfiguration, MaterialItem } from '../types';
import { axiosApiService } from '../services/axiosApi';
import { servicosService } from '../services/servicosService';
import { ENDPOINTS } from '../config/api';
import CriacaoQuadroModular from './CriacaoQuadroModular';
import CriacaoKitModal from './CriacaoKitModal';
import ViewToggle from './ui/ViewToggle';

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
const CubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9-9" />
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
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.038-2.124H9.038c-1.128 0-2.038.944-2.038 2.124v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);
const Squares2x2Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
);
const WrenchScrewdriverIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
);

interface CatalogoProps {
    toggleSidebar: () => void;
}

const Catalogo: React.FC<CatalogoProps> = ({ toggleSidebar }) => {
    const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<CatalogItemType | 'Todos'>('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
    const [kitDetalhes, setKitDetalhes] = useState<any>(null);
    const [loadingKitDetalhes, setLoadingKitDetalhes] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<CatalogItem | null>(null);
    const [itemToDelete, setItemToDelete] = useState<CatalogItem | null>(null);
    const [showQuadroModal, setShowQuadroModal] = useState(false);
    const [showKitModal, setShowKitModal] = useState(false);
    const [kitParaEditar, setKitParaEditar] = useState<any>(null);

    const loadCatalogItems = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const catalogItems: CatalogItem[] = [];
            
            // Carregar apenas Kits e Serviços (NÃO carregar Produtos/Materiais - eles ficam apenas no Estoque)
            try {
                // Carregar Kits
                const kitsResponse = await axiosApiService.get(ENDPOINTS.KITS);
                if (kitsResponse.success && kitsResponse.data) {
                    const kits = Array.isArray(kitsResponse.data) ? kitsResponse.data : [];
                    kits.forEach((kit: any) => {
                        // Calcular preço total incluindo itens do banco frio
                        let precoTotal = 0;
                        
                        // Somar itens do estoque real
                        if (kit.items && Array.isArray(kit.items)) {
                            kit.items.forEach((item: any) => {
                                const precoVenda = item.material?.valorVenda || item.material?.preco || 0;
                                precoTotal += (item.quantidade || 0) * precoVenda;
                            });
                        }
                        
                        // Somar itens do banco frio
                        if (kit.itensFaltantes && Array.isArray(kit.itensFaltantes) && kit.itensFaltantes.length > 0) {
                            kit.itensFaltantes.forEach((item: any) => {
                                const precoUnit = item.precoUnit || item.preco || item.valorUnitario || 0;
                                const quantidade = item.quantidade || 0;
                                precoTotal += precoUnit * quantidade;
                            });
                        }
                        
                        // Usar preço calculado se for maior que 0, senão usar o preço salvo
                        const precoFinal = precoTotal > 0 ? precoTotal : (kit.preco || 0);
                        
                        catalogItems.push({
                            id: kit.id,
                            name: kit.nome,
                            description: kit.descricao || 'Kit sem descrição',
                            price: precoFinal,
                            category: kit.tipo || 'Kit',
                            type: 'Kit' as CatalogItemType,
                            createdAt: kit.createdAt || new Date().toISOString(),
                            updatedAt: kit.updatedAt || new Date().toISOString(),
                            // Campos adicionais para controle de estoque
                            temItensCotacao: kit.temItensCotacao || false,
                            itensFaltantes: kit.itensFaltantes || [],
                            statusEstoque: kit.statusEstoque || 'COMPLETO',
                            isActive: kit.ativo !== false
                        } as any);
                    });
                    console.log(`✅ ${kits.length} kits carregados`);
                }
                
                // TODO: Implementar carregamento de Serviços quando endpoint estiver disponível  
                // const servicosResponse = await axiosApiService.get(ENDPOINTS.SERVICOS);
                // if (servicosResponse.success && servicosResponse.data) { ... }
                
                console.log('📦 Catálogo configurado para mostrar apenas Kits e Serviços');
                console.log('ℹ️ Produtos/Materiais estão disponíveis na página de Estoque');
            } catch (err) {
                console.warn('Erro ao carregar kits/serviços:', err);
            }
            
            setCatalogItems(catalogItems);
        } catch (err) {
            setError('Erro ao carregar catálogo');
            console.error('Erro ao carregar catálogo:', err);
            setCatalogItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCatalogItems();
    }, []);

    // Filtros
    const filteredItems = useMemo(() => {
        let filtered = catalogItems;

        // Filtro por tipo
        if (filter !== 'Todos') {
            filtered = filtered.filter(item => item.type === filter);
        }

        // Filtro por busca
        if (searchTerm) {
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        return filtered;
    }, [catalogItems, filter, searchTerm]);

    // Estatísticas
    const stats = useMemo(() => {
        const totalItems = catalogItems.length;
        const produtos = catalogItems.filter(item => item.type === CatalogItemType.Produto).length;
        const kits = catalogItems.filter(item => item.type === CatalogItemType.Kit).length;
        const servicos = catalogItems.filter(item => item.type === CatalogItemType.Servico).length;
        const totalValue = catalogItems.reduce((acc, item) => acc + item.price, 0);

        return { totalItems, produtos, kits, servicos, totalValue };
    }, [catalogItems]);

    // Handlers
    const handleOpenModal = async (item: CatalogItem | null = null) => {
        // Se for kit, abrir modal de edição de kit
        if (item && item.type === 'Kit') {
            await handleEditarKit(item);
        } else {
            // Para outros tipos (serviços), usar modal genérico
            setItemToEdit(item);
            setIsModalOpen(true);
        }
    };

    const handleEditarKit = async (item: CatalogItem) => {
        try {
            // Carregar detalhes completos do kit
            const response = await axiosApiService.get(`${ENDPOINTS.KITS}/${item.id}`);
            if (response.success && response.data) {

                // Garantir que itensFaltantes seja um array para o modal de edição
                const kitData: any = { ...response.data };
                if (kitData.itensFaltantes) {
                    // Se for string JSON, fazer parse
                    if (typeof kitData.itensFaltantes === 'string') {
                        try {
                            kitData.itensFaltantes = JSON.parse(kitData.itensFaltantes);
                        } catch (e) {
                            console.error('Erro ao fazer parse de itensFaltantes:', e);
                            kitData.itensFaltantes = [];
                        }
                    }
                    // Garantir que seja array
                    if (!Array.isArray(kitData.itensFaltantes)) {
                        kitData.itensFaltantes = [];
                    }
                } else {
                    kitData.itensFaltantes = [];
                }
                
                setKitParaEditar(kitData);
                setShowKitModal(true);
            }
        } catch (error) {
            console.error('Erro ao carregar kit para edição:', error);
            toast.error('Erro ao carregar kit para edição');
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setItemToEdit(null);
    };


    // Fechar modais com ESC
    useEscapeKey(isModalOpen, handleCloseModal);
    useEscapeKey(showKitModal, () => {
        setShowKitModal(false);
        setKitParaEditar(null);
    });
    useEscapeKey(showQuadroModal, () => setShowQuadroModal(false));
    useEscapeKey(!!itemToDelete, () => setItemToDelete(null));

    const handleViewItem = async (item: CatalogItem) => {
        setSelectedItem(item);
        
        // Se for um kit, carregar detalhes completos
        if (item.type === 'Kit') {
            try {
                setLoadingKitDetalhes(true);
                const response = await axiosApiService.get(`${ENDPOINTS.KITS}/${item.id}`);
                const kitData = response.data as any;
                console.log('📦 Detalhes do kit carregados:', kitData);
                console.log('   - Items:', kitData?.items?.length || 0);

                console.log('   - ItensFaltantes (raw):', kitData?.itensFaltantes);
                console.log('   - ItensFaltantes (type):', typeof kitData?.itensFaltantes);
                console.log('   - temItensCotacao:', kitData?.temItensCotacao);
                console.log('   - statusEstoque:', kitData?.statusEstoque);
                
                if (response.success && kitData) {

                    // Garantir que itensFaltantes seja um array
                    const kitDataProcessed: any = { ...kitData };
                    
                    // Processar itensFaltantes - pode vir como objeto, array, string JSON ou null
                    let itensFaltantesProcessados: any[] = [];
                    if (kitDataProcessed.itensFaltantes) {
                        if (typeof kitDataProcessed.itensFaltantes === 'string') {
                            try {
                                const parsed = JSON.parse(kitDataProcessed.itensFaltantes);
                                itensFaltantesProcessados = Array.isArray(parsed) ? parsed : [parsed];
                            } catch (e) {
                                console.error('Erro ao fazer parse de itensFaltantes:', e);
                                itensFaltantesProcessados = [];
                            }
                        } else if (Array.isArray(kitDataProcessed.itensFaltantes)) {
                            itensFaltantesProcessados = kitDataProcessed.itensFaltantes;
                        } else if (typeof kitDataProcessed.itensFaltantes === 'object') {
                            // Se for um objeto único, converter para array
                            itensFaltantesProcessados = [kitDataProcessed.itensFaltantes];
                        }
                    }
                    
                    kitDataProcessed.itensFaltantes = itensFaltantesProcessados;
                    
                    console.log('   - ItensFaltantes (processed):', kitDataProcessed.itensFaltantes);
                    console.log('   - ItensFaltantes (length):', kitDataProcessed.itensFaltantes.length);
                    setKitDetalhes(kitDataProcessed);
                }
            } catch (error) {
                console.error('Erro ao carregar detalhes do kit:', error);
                toast.error('Erro ao carregar detalhes do kit');
            } finally {
                setLoadingKitDetalhes(false);
            }
        }
    };

    const handleCloseViewModal = () => {
        setSelectedItem(null);
        setKitDetalhes(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            // Note: Esta funcionalidade requer implementação completa de criação/edição
            // Por enquanto, apenas fecha o modal
            alert('✅ Funcionalidade de criação/edição será implementada em breve!');
            handleCloseModal();
            await loadCatalogItems();
        } catch (error) {
            console.error('Erro ao salvar item:', error);
            alert('❌ Erro ao salvar item. Verifique o console para mais detalhes.');
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        
        try {
            // Verificar o tipo do item e deletar conforme necessário
            if (itemToDelete.type === 'Kit') {
                const response = await axiosApiService.delete(`${ENDPOINTS.KITS}/${itemToDelete.id}`);
                if (response.success) {
                    toast.success('Kit removido com sucesso!', {
                        description: `"${itemToDelete.name}" foi excluído do catálogo`,
                        icon: '🗑️'
                    });
                    setItemToDelete(null);
                    await loadCatalogItems();
                } else {
                    toast.error('Erro ao remover kit', {
                        description: response.error || 'Erro desconhecido'
                    });
                }
            } else if (itemToDelete.type === CatalogItemType.Servico) {
                const servicoItem = itemToDelete as ServiceCatalogItem;
                const response = await servicosService.desativar(servicoItem.id);
                if (response.success) {
                    toast.success('Serviço removido com sucesso!', {
                        description: `"${servicoItem.name}" foi desativado`,
                        icon: '🗑️'
                    });
                    setItemToDelete(null);
                    await loadCatalogItems();
                } else {
                    toast.error('Erro ao remover serviço', {
                        description: response.error || 'Erro desconhecido'
                    });
                }
            } else {
                toast.info('Funcionalidade em desenvolvimento', {
                    description: 'Remoção de outros tipos de itens será implementada em breve'
                });
                setItemToDelete(null);
            }
        } catch (error: any) {
            console.error('Erro ao remover item:', error);
            toast.error('Erro ao remover item', {
                description: error?.response?.data?.error || error.message || 'Erro ao comunicar com servidor'
            });
        }
    };

    const getTypeIcon = (type: CatalogItemType) => {
        switch (type) {
            case CatalogItemType.Produto:
                return '📦';
            case CatalogItemType.Kit:
                return '🔧';
            case CatalogItemType.Servico:
                return '⚙️';
            default:
                return '📋';
        }
    };

    const getTypeColor = (type: CatalogItemType) => {
        switch (type) {
            case CatalogItemType.Produto:
                return 'bg-blue-100 text-blue-800 ring-1 ring-blue-200';
            case CatalogItemType.Kit:
                return 'bg-green-100 text-green-800 ring-1 ring-green-200';
            case CatalogItemType.Servico:
                return 'bg-purple-100 text-purple-800 ring-1 ring-purple-200';
            default:
                return 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
        }
    };

    const getTypeName = (type: CatalogItemType) => {
        switch (type) {
            case CatalogItemType.Produto:
                return 'Produto';
            case CatalogItemType.Kit:
                return 'Kit';
            case CatalogItemType.Servico:
                return 'Serviço';
            default:
                return 'Item';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando catálogo...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 rounded-xl hover:bg-white hover:shadow-soft">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">Catálogo</h1>
                        <p className="text-sm sm:text-base text-gray-500 mt-1">Gerencie produtos, kits e serviços</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowQuadroModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all shadow-medium font-semibold"
                    >
                        <Squares2x2Icon className="w-5 h-5" />
                        Criar Quadro Elétrico
                    </button>
                    <button
                        onClick={() => setShowKitModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl hover:from-teal-700 hover:to-teal-600 transition-all shadow-medium font-semibold"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Novo Item
                    </button>
                </div>
            </header>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 animate-fade-in">
                    <p className="text-red-800 font-medium">⚠️ {error}</p>
                </div>
            )}

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center">
                            <CubeIcon className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total de Itens</p>
                            <p className="text-2xl font-bold text-teal-600">{stats.totalItems}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                            <span className="text-2xl">📦</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Produtos</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.produtos}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                            <WrenchScrewdriverIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Kits</p>
                            <p className="text-2xl font-bold text-green-600">{stats.kits}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                            <span className="text-2xl">⚙️</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Serviços</p>
                            <p className="text-2xl font-bold text-purple-600">{stats.servicos}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center">
                            <span className="text-2xl">💰</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Valor Médio</p>
                            <p className="text-2xl font-bold text-yellow-600">
                                R$ {stats.totalItems > 0 ? (stats.totalValue / stats.totalItems).toFixed(0) : '0'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, descrição ou categoria..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                    </div>

                    <div>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as CatalogItemType | 'Todos')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="Todos">Todos os Tipos</option>
                            <option value={CatalogItemType.Produto}>Produtos</option>
                            <option value={CatalogItemType.Kit}>Kits</option>
                            <option value={CatalogItemType.Servico}>Serviços</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-end">
                        <div className="flex items-center gap-4">
                            <p className="text-sm text-gray-600">
                                <span className="font-bold text-gray-900">{filteredItems.length}</span> itens encontrados
                            </p>
                            <ViewToggle view={viewMode} onViewChange={setViewMode} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Aviso sobre Produtos/Materiais */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6 flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">ℹ️</span>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-blue-900 mb-2">Produtos/Materiais estão no Estoque</h3>
                    <p className="text-blue-800">
                        Esta página exibe apenas <strong>Kits</strong> e <strong>Serviços</strong>. 
                        Para visualizar produtos/materiais individuais, acesse a página de <strong>Estoque</strong>.
                    </p>
                </div>
            </div>

            {/* Grid de Itens do Catálogo */}
            {filteredItems.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">📋</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhum kit ou serviço encontrado</h3>
                    <p className="text-gray-500 mb-6">
                        {searchTerm || filter !== 'Todos'
                            ? 'Tente ajustar os filtros de busca'
                            : 'Comece adicionando kits ou serviços ao catálogo'}
                    </p>
                    {!searchTerm && filter === 'Todos' && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-gradient-to-r from-teal-600 to-teal-500 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-teal-600 transition-all shadow-medium font-semibold"
                        >
                            <PlusIcon className="w-5 h-5 inline mr-2" />
                            Adicionar Kit ou Serviço
                        </button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map((item) => (
                        <div key={item.id} className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium hover:border-teal-300 transition-all duration-200">
                            {/* Header do Card */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-900 mb-1">{item.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${getTypeColor(item.type)}`}>
                                            {getTypeIcon(item.type)} {getTypeName(item.type)}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-teal-700">
                                        R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    {(item as any).valorVenda && (item as any).valorVenda !== item.price && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Venda: R$ {(item as any).valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Informações */}
                            <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>📂</span>
                                    <span className="truncate">{item.category || 'Sem categoria'}</span>
                                </div>
                                <div className="text-sm text-gray-600">
                                    <p className="line-clamp-2">{item.description}</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>📅</span>
                                    <span>Criado em: {item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}</span>
                                </div>
                            </div>

                            {/* Status e Alertas */}
                            <div className="mb-4 space-y-2">
                                <span className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${
                                    item.isActive 
                                        ? 'bg-green-100 text-green-800 ring-1 ring-green-200' 
                                        : 'bg-red-100 text-red-800 ring-1 ring-red-200'
                                }`}>
                                    {item.isActive ? '✅ Ativo' : '❌ Inativo'}
                                </span>
                                
                                {/* Flag de itens faltantes (para quadros elétricos) */}
                                {(item as any).statusEstoque === 'PENDENTE' && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">⚠️</span>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-yellow-900">Itens Faltantes</p>
                                                <p className="text-xs text-yellow-700">
                                                    {(item as any).itensFaltantes?.length || 0} item(ns) pendente(s)
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {(item as any).temItensCotacao && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">❄️</span>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-blue-900">Banco Frio</p>
                                                <p className="text-xs text-blue-700">Requer compra de itens</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => handleViewItem(item)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                >
                                    <EyeIcon className="w-4 h-4" />
                                    Ver
                                </button>
                                <button
                                    onClick={() => handleOpenModal(item)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors text-sm font-semibold"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    Editar
                                </button>
                                <button
                                    onClick={() => setItemToDelete(item)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                    Remover
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Visualização em Lista */
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-soft">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Item</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Tipo</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Categoria</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Preço / Venda</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-semibold text-gray-900">{item.name}</p>
                                            <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
                                            {/* Flags */}
                                            <div className="flex gap-2 mt-2">
                                                {(item as any).statusEstoque === 'PENDENTE' && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                        ⚠️ {(item as any).itensFaltantes?.length || 0} Faltantes
                                                    </span>
                                                )}
                                                {(item as any).temItensCotacao && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                        ❄️ Banco Frio
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${getTypeColor(item.type)}`}>
                                            {getTypeIcon(item.type)} {getTypeName(item.type)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{item.category || 'Sem categoria'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="text-lg font-bold text-teal-700">
                                            R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                        {(item as any).valorVenda && (item as any).valorVenda !== item.price && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Venda: R$ {(item as any).valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${
                                            item.isActive 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {item.isActive ? '✅ Ativo' : '❌ Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleViewItem(item)}
                                                className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                                title="Visualizar"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleOpenModal(item)}
                                                className="p-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors"
                                                title="Editar"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setItemToDelete(item)}
                                                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                                title="Remover"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL DE CRIAÇÃO/EDIÇÃO (Simplificado) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="modal-content max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
                        {/* Header */}
                        <div className="modal-header bg-gradient-to-r from-teal-50 to-blue-50 dark:from-slate-800 dark:to-slate-900">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-medium ring-2 ring-teal-100 dark:ring-teal-900/50">
                                    {itemToEdit ? <PencilIcon className="w-7 h-7 text-white" /> : <PlusIcon className="w-7 h-7 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                                        {itemToEdit ? 'Editar Item' : 'Novo Item'}
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                                        {itemToEdit ? 'Atualize as informações do item' : 'Adicione um novo item ao catálogo'}
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
                            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                                <p className="text-blue-800 dark:text-blue-300 font-medium">
                                    🚧 Modal simplificado para demonstração. 
                                    A implementação completa incluirá formulários específicos para cada tipo de item.
                                </p>
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
                                    {itemToEdit ? 'Atualizar' : 'Adicionar'} Item
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE VISUALIZAÇÃO */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-strong max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
                        {/* Header fixo */}
                        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 via-blue-50 to-purple-50 flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center shadow-lg">
                                    <CubeIcon className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900">Detalhes do Item</h2>
                                    <p className="text-sm text-gray-600 mt-1">Informações completas do item</p>
                                </div>
                            </div>
                            <button onClick={handleCloseViewModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-xl transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Conteúdo scrollável */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Informações principais em layout horizontal */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                                {/* Coluna 1: Informações Básicas */}
                                <div className="lg:col-span-2 space-y-4">
                                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200">
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Nome do Item</h3>
                                        <p className="text-2xl font-bold text-gray-900">{selectedItem.name}</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Tipo</h3>
                                            <span className={`px-3 py-1.5 text-sm font-bold rounded-lg ${getTypeColor(selectedItem.type)}`}>
                                                {getTypeIcon(selectedItem.type)} {getTypeName(selectedItem.type)}
                                            </span>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Categoria</h3>
                                            <p className="text-lg font-semibold text-gray-900">{selectedItem.category || 'Sem categoria'}</p>
                                        </div>
                                    </div>

                                    {selectedItem.description && (
                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                                            <h3 className="text-xs font-semibold text-blue-700 uppercase mb-2">Descrição</h3>
                                            <p className="text-gray-700">{selectedItem.description}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Coluna 2: Preço e Status */}
                                <div className="space-y-4">
                                    <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-xl border-2 border-teal-200 shadow-lg">
                                        <h3 className="text-xs font-semibold text-teal-700 uppercase mb-3">Valor Total</h3>
                                        <p className="text-4xl font-bold text-teal-700 mb-2">
                                            R$ {(() => {
                                                // Calcular preço total do kit incluindo itens do banco frio
                                                if (selectedItem.type === 'Kit' && kitDetalhes) {
                                                    let total = 0;
                                                    
                                                    // Somar itens do estoque real
                                                    if (kitDetalhes.items) {
                                                        kitDetalhes.items.forEach((item: any) => {
                                                            const precoVenda = item.material?.valorVenda || item.material?.preco || 0;
                                                            total += (item.quantidade || 0) * precoVenda;
                                                        });
                                                    }
                                                    
                                                    // Somar itens do banco frio
                                                    if (kitDetalhes.itensFaltantes && Array.isArray(kitDetalhes.itensFaltantes)) {
                                                        kitDetalhes.itensFaltantes.forEach((item: any) => {
                                                            const precoUnit = item.precoUnit || item.preco || item.valorUnitario || 0;
                                                            total += (item.quantidade || 0) * precoUnit;
                                                        });
                                                    }
                                                    
                                                    return total > 0 ? total : selectedItem.price;
                                                }
                                                return selectedItem.price;
                                            })().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs text-teal-600">Preço total do kit</p>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Status</h3>
                                        <span className={`px-4 py-2 text-sm font-bold rounded-lg inline-block ${
                                            selectedItem.isActive 
                                                ? 'bg-green-100 text-green-800 ring-2 ring-green-200' 
                                                : 'bg-red-100 text-red-800 ring-2 ring-red-200'
                                        }`}>
                                            {selectedItem.isActive ? '✅ Ativo' : '❌ Inativo'}
                                        </span>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Criado em</h3>
                                        <p className="text-sm font-medium text-gray-900">{selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleDateString('pt-BR') : 'Data não disponível'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Composição do Kit (se for um Kit) */}
                            {selectedItem.type === 'Kit' && (
                                <div className="mt-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-1 h-8 bg-gradient-to-b from-teal-500 to-blue-500 rounded-full"></div>
                                        <h3 className="text-2xl font-bold text-gray-900">Composição do Kit</h3>
                                    </div>
                                    
                                    {loadingKitDetalhes ? (
                                        <div className="text-center py-12">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                                            <p className="text-sm text-gray-600 mt-3">Carregando composição...</p>
                                        </div>
                                    ) : kitDetalhes ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Coluna 1: Itens do Estoque Real */}
                                            {kitDetalhes.items && kitDetalhes.items.length > 0 && (
                                                <div className="bg-white rounded-xl border-2 border-green-200 shadow-lg overflow-hidden">
                                                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
                                                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                                                            <span>✅</span> Itens do Estoque Real ({kitDetalhes.items.length})
                                                        </h4>
                                                    </div>
                                                    <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                                                        {kitDetalhes.items.map((item: any, index: number) => {
                                                            const precoVenda = item.material?.valorVenda || item.material?.preco || 0;
                                                            const subtotal = (item.quantidade || 0) * precoVenda;
                                                            
                                                            return (
                                                                <div key={index} className="bg-green-50 border border-green-200 p-4 rounded-lg hover:shadow-md transition-shadow">
                                                                    <div className="flex justify-between items-start gap-4">
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-bold text-gray-900 text-sm mb-1">
                                                                                {item.material?.nome || item.material?.descricao || 'Material'}
                                                                            </p>
                                                                            <div className="flex flex-wrap gap-2 items-center mt-2">
                                                                                <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                                                                                    {item.quantidade} {item.material?.unidadeMedida || 'UN'}
                                                                                </span>
                                                                                <span className="text-xs text-gray-500">×</span>
                                                                                <span className="text-xs font-semibold text-green-700">
                                                                                    R$ {precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                                </span>
                                                                                {item.material?.valorVenda && item.material?.valorVenda !== item.material?.preco && (
                                                                                    <span className="text-xs text-gray-400 line-through">
                                                                                        Compra: R$ {(item.material?.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right flex-shrink-0">
                                                                            <p className="text-lg font-bold text-green-700">
                                                                                R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Coluna 2: Itens do Banco Frio */}
                                            {kitDetalhes.itensFaltantes && Array.isArray(kitDetalhes.itensFaltantes) && kitDetalhes.itensFaltantes.length > 0 && (
                                                <div className="bg-white rounded-xl border-2 border-blue-200 shadow-lg overflow-hidden">
                                                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                                                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                                                            <span>❄️</span> Itens do Banco Frio ({kitDetalhes.itensFaltantes.length})
                                                        </h4>
                                                    </div>
                                                    <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                                                        {kitDetalhes.itensFaltantes.map((item: any, index: number) => {
                                                            const nome = item.nome || item.materialNome || 'Item do Banco Frio';
                                                            const quantidade = item.quantidade || 0;
                                                            const precoUnit = item.precoUnit || item.preco || item.valorUnitario || 0;
                                                            const subtotal = quantidade * precoUnit;
                                                            const unidadeMedida = item.unidadeMedida || 'UN';
                                                            const dataUltimaCotacao = item.dataUltimaCotacao || item.dataAtualizacao;
                                                            
                                                            return (
                                                                <div key={index} className="bg-blue-50 border border-blue-200 p-4 rounded-lg hover:shadow-md transition-shadow">
                                                                    <div className="flex justify-between items-start gap-4">
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-bold text-gray-900 text-sm mb-1">
                                                                                {nome}
                                                                            </p>
                                                                            <div className="flex flex-wrap gap-2 items-center mt-2">
                                                                                <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                                                                                    {quantidade} {unidadeMedida}
                                                                                </span>
                                                                                <span className="text-xs text-gray-500">×</span>
                                                                                <span className="text-xs font-semibold text-blue-700">
                                                                                    R$ {precoUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                                </span>
                                                                                {dataUltimaCotacao && (
                                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                                        📅 {(() => {
                                                                                            try {
                                                                                                const data = new Date(dataUltimaCotacao);
                                                                                                return !isNaN(data.getTime()) ? data.toLocaleDateString('pt-BR') : 'Sem data';
                                                                                            } catch {
                                                                                                return 'Sem data';
                                                                                            }
                                                                                        })()}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right flex-shrink-0">
                                                                            <p className="text-lg font-bold text-blue-700">
                                                                                R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="p-4 bg-orange-50 border-t border-orange-200">
                                                        <p className="text-xs text-orange-800 font-medium flex items-center gap-2">
                                                            <span>⚠️</span>
                                                            Estes itens precisam ser comprados e adicionados ao estoque antes de usar o kit em obras
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Se não tem nenhum item */}
                                            {(!kitDetalhes.items || kitDetalhes.items.length === 0) && 
                                             (!kitDetalhes.itensFaltantes || kitDetalhes.itensFaltantes.length === 0) && (
                                                <div className="col-span-2 text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                                                    <p className="text-lg font-medium">Nenhum item na composição</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                                            <p className="text-lg font-medium">Erro ao carregar composição do kit</p>
                                        </div>
                                    )}

                                    {/* Resumo do Valor Total - Full Width */}
                                    {(kitDetalhes && ((kitDetalhes.items && kitDetalhes.items.length > 0) || 
                                     (kitDetalhes.itensFaltantes && Array.isArray(kitDetalhes.itensFaltantes) && kitDetalhes.itensFaltantes.length > 0))) && (
                                        <div className="mt-6 p-6 bg-gradient-to-r from-teal-500 via-blue-500 to-purple-500 rounded-xl shadow-xl">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-xl font-bold text-white">Valor Total do Kit:</h4>
                                                <p className="text-4xl font-bold text-white">
                                                    R$ {(() => {
                                                        let total = 0;
                                                        
                                                        if (kitDetalhes.items) {
                                                            kitDetalhes.items.forEach((item: any) => {
                                                                const precoVenda = item.material?.valorVenda || item.material?.preco || 0;
                                                                total += (item.quantidade || 0) * precoVenda;
                                                            });
                                                        }
                                                        
                                                        if (kitDetalhes.itensFaltantes && Array.isArray(kitDetalhes.itensFaltantes)) {
                                                            kitDetalhes.itensFaltantes.forEach((item: any) => {
                                                                const precoUnit = item.precoUnit || item.preco || item.valorUnitario || 0;
                                                                total += (item.quantidade || 0) * precoUnit;
                                                            });
                                                        }
                                                        
                                                        return total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Alertas de Estoque (para quadros elétricos) */}
                            {(selectedItem as any).statusEstoque === 'PENDENTE' && (selectedItem as any).itensFaltantes && (
                                <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-6 shadow-lg">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center">
                                            <span className="text-2xl">⚠️</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-yellow-900 text-xl">Itens Faltantes em Estoque</h3>
                                            <p className="text-sm text-yellow-700 mt-1">
                                                Este quadro possui itens que precisam ser comprados ou reabastecidos
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {JSON.parse(JSON.stringify((selectedItem as any).itensFaltantes || [])).map((item: any, idx: number) => (
                                            <div key={idx} className="bg-white border border-yellow-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <p className="font-semibold text-gray-900 text-sm mb-2">{item.nome}</p>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-medium px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                                                        {item.tipo === 'COTACAO' ? '❄️ Banco Frio' : '📦 Estoque Insuficiente'}
                                                    </span>
                                                    <span className="text-sm font-bold text-yellow-700">
                                                        {item.quantidade} un necessária(s)
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer fixo com botão de fechar */}
                        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                            <button
                                onClick={handleCloseViewModal}
                                className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded-xl hover:from-gray-700 hover:to-gray-600 transition-all shadow-md font-semibold"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
            {itemToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-strong max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Remover Item</h3>
                        <p className="text-gray-600 mb-6">
                            Tem certeza que deseja remover o item <strong>"{itemToDelete.name}"</strong> do catálogo? 
                            Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setItemToDelete(null)}
                                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold"
                            >
                                Remover
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal de Criação de Quadro Elétrico */}
            <CriacaoQuadroModular
                isOpen={showQuadroModal}
                onClose={() => setShowQuadroModal(false)}
                onSave={() => {
                    setShowQuadroModal(false);
                    loadCatalogItems();
                }}
            />

            {/* Modal de Criação/Edição de Kit */}
            <CriacaoKitModal
                isOpen={showKitModal}
                onClose={() => {
                    setShowKitModal(false);
                    setKitParaEditar(null);
                }}
                onSave={() => {
                    setShowKitModal(false);
                    setKitParaEditar(null);
                    loadCatalogItems();
                }}
                kitParaEditar={kitParaEditar}
            />
        </div>
    );
};

export default Catalogo;