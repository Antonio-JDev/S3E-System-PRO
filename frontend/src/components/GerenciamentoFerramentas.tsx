import React, { useState, useEffect, useMemo } from 'react';
import { axiosApiService } from '../services/axiosApi';
import { toast } from 'sonner';
import { getUploadUrl } from '../config/api';
import { useEscapeKey } from '../hooks/useEscapeKey';
import ViewToggle from './ui/ViewToggle';
import { loadViewMode, saveViewMode } from '../utils/viewModeStorage';
import { matchCrossSearch } from '../utils/searchUtils';
import AlertDialog from './ui/AlertDialog';
import ScrollableRow from './ui/ScrollableRow';
import { scrollableNavItemClasses } from '../utils/responsiveNav';

// Icons
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

const WrenchIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z" />
    </svg>
);

const BriefcaseIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
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

interface Ferramenta {
    id: string;
    nome: string;
    codigo: string;
    categoria: string;
    marca?: string;
    modelo?: string;
    descricao?: string;
    valorCompra?: number;
    quantidade?: number; // Quantidade em estoque
    imagemUrl?: string;
    ativo: boolean;
    createdAt: string;
    updatedAt: string;
}

interface KitFerramenta {
    id: string;
    nome: string;
    descricao?: string;
    eletricistaId: string;
    eletricistaNome: string;
    dataEntrega: string;
    imagemUrl?: string;
    assinatura?: string;
    observacoes?: string;
    ativo: boolean;
    createdAt: string;
    precoTotal?: number; // Preço total do kit (soma dos subtotais das ferramentas)
    itens: KitItem[];
}

interface KitItem {
    id: string;
    kitId: string;
    ferramentaId: string;
    quantidade: number;
    estadoEntrega: string;
    observacoes?: string;
    dataAdicao?: string; // Data em que a ferramenta foi adicionada ao kit
    ferramenta: Ferramenta;
}

interface FerramentasProps {
    toggleSidebar: () => void;
}

type TabType = 'ferramentas' | 'kits';

const Ferramentas: React.FC<FerramentasProps> = ({ toggleSidebar }) => {
    const [activeTab, setActiveTab] = useState<TabType>('ferramentas');
    const [ferramentas, setFerramentas] = useState<Ferramenta[]>([]);
    const [kits, setKits] = useState<KitFerramenta[]>([]);
    const [loading, setLoading] = useState(true);
    const [estatisticas, setEstatisticas] = useState<any>(null);
    
    // Pesquisa e visualização
    const [pesquisa, setPesquisa] = useState('');
    const [pesquisaKit, setPesquisaKit] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState<string>('Todos');
    const [filtroEstoque, setFiltroEstoque] = useState<'Todos' | 'Disponivel' | 'SemEstoque'>('Todos');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(loadViewMode('Ferramentas'));
    const [viewModeKit, setViewModeKit] = useState<'grid' | 'list'>(loadViewMode('Kits'));
    
    // Salvar viewMode no localStorage quando mudar
    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        saveViewMode('Ferramentas', mode);
    };

    const handleViewModeKitChange = (mode: 'grid' | 'list') => {
        setViewModeKit(mode);
        saveViewMode('Kits', mode);
    };

    // Modais
    const [modalNovaFerramenta, setModalNovaFerramenta] = useState(false);
    const [modalNovoKit, setModalNovoKit] = useState(false);
    const [modalEditarFerramenta, setModalEditarFerramenta] = useState(false);
    const [ferramentaEditando, setFerramentaEditando] = useState<Ferramenta | null>(null);
    const [modalVisualizarFerramenta, setModalVisualizarFerramenta] = useState(false);
    const [ferramentaVisualizando, setFerramentaVisualizando] = useState<Ferramenta | null>(null);
    const [modalVisualizarKit, setModalVisualizarKit] = useState(false);
    const [kitVisualizando, setKitVisualizando] = useState<KitFerramenta | null>(null);
    const [modalEditarKit, setModalEditarKit] = useState(false);
    const [kitEditando, setKitEditando] = useState<KitFerramenta | null>(null);
    const [assinaturaEletricista, setAssinaturaEletricista] = useState<string>('');
    const [fotoKitEntregue, setFotoKitEntregue] = useState<File | null>(null);
    const [fotoKitPreview, setFotoKitPreview] = useState<string>('');

    // Estados para diálogos de confirmação
    const [showDeleteKitDialog, setShowDeleteKitDialog] = useState(false);
    const [kitToDelete, setKitToDelete] = useState<KitFerramenta | null>(null);
    const [showDeleteFerramentaDialog, setShowDeleteFerramentaDialog] = useState(false);
    const [ferramentaToDelete, setFerramentaToDelete] = useState<string | null>(null);

    // Estado para rastrear itens já salvos que devem ser removidos do kit
    const [itensParaRemover, setItensParaRemover] = useState<string[]>([]);

    // Form estados
    const [formFerramenta, setFormFerramenta] = useState({
        nome: '',
        codigo: '',
        categoria: '',
        marca: '',
        modelo: '',
        descricao: '',
        valorCompra: '',
        quantidade: '0',
        imagemUrl: ''
    });

    const [formKit, setFormKit] = useState({
        nome: '',
        descricao: '',
        eletricistaId: '',
        eletricistaNome: '',
        dataEntrega: new Date().toISOString().split('T')[0],
        observacoes: '',
        itens: [] as Array<{ ferramentaId: string; quantidade: number; estadoEntrega: string; observacoes?: string }>
    });

    const [eletricistas, setEletricistas] = useState<any[]>([]);
    const [ferramentasSelecionadas, setFerramentasSelecionadas] = useState<string[]>([]);

    // Hooks ESC para fechar modais
    useEscapeKey(modalNovaFerramenta, () => setModalNovaFerramenta(false));
    useEscapeKey(modalEditarFerramenta, () => {
        setModalEditarFerramenta(false);
        setFerramentaEditando(null);
    });
    useEscapeKey(modalNovoKit, () => setModalNovoKit(false));
    useEscapeKey(modalVisualizarFerramenta, () => {
        setModalVisualizarFerramenta(false);
        setFerramentaVisualizando(null);
    });
    useEscapeKey(modalVisualizarKit, () => {
        setModalVisualizarKit(false);
        setKitVisualizando(null);
    });
    useEscapeKey(modalEditarKit, () => {
        setModalEditarKit(false);
        setKitEditando(null);
        setFotoKitEntregue(null);
        setFotoKitPreview('');
        setItensParaRemover([]);
        setFerramentasSelecionadas([]);
    });

    useEffect(() => {
        loadData();
    }, []);

    // Filtrar ferramentas por pesquisa
    const categoriasFerramenta = useMemo(() => {
        return Array.from(
            new Set(
                ferramentas
                    .map((f) => f.categoria?.trim())
                    .filter((c): c is string => Boolean(c))
            )
        ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }, [ferramentas]);

    const ferramentasFiltradas = useMemo(() => {
        const termoBusca = pesquisa.toLowerCase().trim();

        return ferramentas.filter((f) => {
            const matchBusca =
                !termoBusca ||
                f.nome.toLowerCase().includes(termoBusca) ||
                f.codigo.toLowerCase().includes(termoBusca) ||
                f.categoria.toLowerCase().includes(termoBusca) ||
                f.marca?.toLowerCase().includes(termoBusca) ||
                f.modelo?.toLowerCase().includes(termoBusca);

            const matchCategoria =
                filtroCategoria === 'Todos' || f.categoria === filtroCategoria;

            const quantidade = f.quantidade || 0;
            const matchEstoque =
                filtroEstoque === 'Todos' ||
                (filtroEstoque === 'Disponivel' && quantidade > 0) ||
                (filtroEstoque === 'SemEstoque' && quantidade <= 0);

            return matchBusca && matchCategoria && matchEstoque;
        });
    }, [ferramentas, pesquisa, filtroCategoria, filtroEstoque]);

    const kitsFiltrados = useMemo(() => {
        if (!pesquisaKit.trim()) return kits;
        
        return kits.filter(k => 
            matchCrossSearch(pesquisaKit, k.nome) ||
            k.eletricistaNome.toLowerCase().includes(pesquisaKit.toLowerCase()) ||
            k.descricao?.toLowerCase().includes(pesquisaKit.toLowerCase())
        );
    }, [kits, pesquisaKit]);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([loadFerramentas(), loadKits(), loadEletricistas(), loadEstatisticas()]);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadEstatisticas = async () => {
        try {
            const response = await axiosApiService.get('/api/ferramentas/estatisticas');
            if (response.success && response.data) {
                setEstatisticas(response.data);
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    };

    const loadFerramentas = async () => {
        try {
            console.log('🔍 Carregando ferramentas...');
            const response = await axiosApiService.get<Ferramenta[]>('/api/ferramentas');
            console.log('📥 Resposta ferramentas:', response);
            if (response.success && response.data) {
                const ferramentasArray = Array.isArray(response.data) ? response.data : [];
                console.log('✅ Ferramentas carregadas:', ferramentasArray.length);
                setFerramentas(ferramentasArray);
            } else {
                console.error('❌ Resposta sem sucesso:', response);
                toast.error('Erro ao carregar ferramentas: ' + (response.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('❌ Erro ao carregar ferramentas:', error);
            toast.error('Erro ao carregar ferramentas');
        }
    };

    const loadKits = async () => {
        try {
            console.log('🔍 Carregando kits...');
            const response = await axiosApiService.get<KitFerramenta[]>('/api/kits-ferramenta');
            console.log('📥 Resposta kits:', response);
            if (response.success && response.data) {
                const kitsArray = Array.isArray(response.data) ? response.data : [];
                console.log('✅ Kits carregados:', kitsArray.length);
                setKits(kitsArray);
            } else {
                console.error('❌ Resposta sem sucesso:', response);
                toast.error('Erro ao carregar kits: ' + (response.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('❌ Erro ao carregar kits:', error);
            toast.error('Erro ao carregar kits');
        }
    };

    const loadEletricistas = async () => {
        try {
            const response = await axiosApiService.get<any[]>('/api/configuracoes/usuarios');
            if (response.success && response.data) {
                const usuariosArray = Array.isArray(response.data) ? response.data : [];
                const eletricistasFiltered = usuariosArray.filter(u => 
                    u.role?.toLowerCase() === 'eletricista' && u.active
                );
                setEletricistas(eletricistasFiltered);
            }
        } catch (error) {
            console.error('Erro ao carregar eletricistas:', error);
        }
    };

    const handleSalvarFerramenta = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const ferramentaData = {
                ...formFerramenta,
                valorCompra: formFerramenta.valorCompra ? parseFloat(formFerramenta.valorCompra) : null,
                quantidade: parseInt(formFerramenta.quantidade) || 0
            };

            if (ferramentaEditando) {
                const response = await axiosApiService.put(`/api/ferramentas/${ferramentaEditando.id}`, ferramentaData);
                if (response.success) {
                    toast.success('✅ Ferramenta atualizada com sucesso!');
                    setModalEditarFerramenta(false);
                    setFerramentaEditando(null);
                    loadFerramentas();
                }
            } else {
                const response = await axiosApiService.post('/api/ferramentas', ferramentaData);
                if (response.success) {
                    toast.success('✅ Ferramenta cadastrada com sucesso!');
                    setModalNovaFerramenta(false);
                    loadFerramentas();
                }
            }
            
            // Limpar form
            setFormFerramenta({
                nome: '',
                codigo: '',
                categoria: '',
                marca: '',
                modelo: '',
                descricao: '',
                valorCompra: '',
                quantidade: '0',
                imagemUrl: ''
            });
        } catch (error: any) {
            console.error('Erro ao salvar ferramenta:', error);
            toast.error('❌ Erro ao salvar ferramenta: ' + (error?.response?.data?.error || error?.message));
        }
    };

    const handleSalvarKit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validar que não há itens duplicados usando o código da ferramenta
        const codigosFerramentas = formKit.itens.map(item => {
            const ferramenta = ferramentas.find(f => f.id === item.ferramentaId);
            return ferramenta?.codigo;
        }).filter(Boolean);
        const codigosUnicos = new Set(codigosFerramentas);
        if (codigosFerramentas.length !== codigosUnicos.size) {
            const codigosDuplicados = codigosFerramentas.filter((codigo, index) => codigosFerramentas.indexOf(codigo) !== index);
            toast.error('❌ Erro: Existem ferramentas com códigos duplicados no kit. Remova duplicatas antes de salvar.', {
                description: `Códigos duplicados: ${[...new Set(codigosDuplicados)].join(', ')}`
            });
            return;
        }

        if (formKit.itens.length === 0) {
            toast.error('❌ Adicione pelo menos uma ferramenta ao kit!');
            return;
        }

        if (!assinaturaEletricista.trim()) {
            toast.error('❌ A assinatura do eletricista é obrigatória!');
            return;
        }

        // Validar estoque antes de criar o kit
        for (const item of formKit.itens) {
            const ferramenta = ferramentas.find(f => f.id === item.ferramentaId);
            if (ferramenta) {
                const quantidadeNecessaria = item.quantidade || 1;
                const estoqueDisponivel = ferramenta.quantidade || 0;
                
                if (estoqueDisponivel < quantidadeNecessaria) {
                    toast.error(
                        `❌ Estoque insuficiente para ${ferramenta.nome}. ` +
                        `Disponível: ${estoqueDisponivel}, Necessário: ${quantidadeNecessaria}`
                    );
                    return;
                }
            }
        }

        try {
            // Preparar dados do kit - garantir itens únicos
            const kitData: any = {
                ...formKit,
                assinatura: assinaturaEletricista,
                // Garantir que itens não estão duplicados
                itens: formKit.itens.filter((item, index, self) => 
                    index === self.findIndex(i => i.ferramentaId === item.ferramentaId)
                )
            };

            // Se tiver foto, fazer upload primeiro
            let imagemUrl = '';
            if (fotoKitEntregue) {
                const formData = new FormData();
                formData.append('imagem', fotoKitEntregue);
                
                const uploadResponse = await axiosApiService.post('/api/kits-ferramenta/upload-foto', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                if (uploadResponse.success && (uploadResponse.data as any)?.url) {
                    imagemUrl = (uploadResponse.data as any).url;
                    kitData.imagemUrl = imagemUrl;
                }
            }

            const response = await axiosApiService.post('/api/kits-ferramenta', kitData);
            if (response.success) {
                toast.success('✅ Kit de ferramentas criado com sucesso!');
                setModalNovoKit(false);
                loadKits();
                
                // Limpar form
                setFormKit({
                    nome: '',
                    descricao: '',
                    eletricistaId: '',
                    eletricistaNome: '',
                    dataEntrega: new Date().toISOString().split('T')[0],
                    observacoes: '',
                    itens: []
                });
                setFerramentasSelecionadas([]);
                setAssinaturaEletricista('');
                setFotoKitEntregue(null);
                setFotoKitPreview('');
            }
        } catch (error: any) {
            console.error('Erro ao salvar kit:', error);
            toast.error('❌ Erro ao salvar kit: ' + (error?.response?.data?.error || error?.message));
        }
    };

    const handleAdicionarFerramentaAoKit = (ferramentaId: string) => {
        if (ferramentasSelecionadas.includes(ferramentaId)) {
            // Remover da seleção temporária (item que ainda não foi salvo)
            setFerramentasSelecionadas(ferramentasSelecionadas.filter(id => id !== ferramentaId));
            setFormKit({
                ...formKit,
                itens: formKit.itens.filter(item => item.ferramentaId !== ferramentaId)
            });
            // Se estava marcado para remover, desmarcar
            if (itensParaRemover.includes(ferramentaId)) {
                setItensParaRemover(itensParaRemover.filter(id => id !== ferramentaId));
            }
        } else {
            // Verificar se há estoque disponível antes de adicionar
            const ferramenta = ferramentas.find(f => f.id === ferramentaId);
            if (!ferramenta) {
                toast.error('❌ Ferramenta não encontrada!');
                return;
            }

            // Verificar se já existe uma ferramenta com o mesmo código no kit
            const codigoFerramenta = ferramenta.codigo;
            const ferramentaComMesmoCodigo = formKit.itens.find(item => {
                const f = ferramentas.find(ferr => ferr.id === item.ferramentaId);
                return f?.codigo === codigoFerramenta;
            });

            if (ferramentaComMesmoCodigo) {
                const ferramentaExistente = ferramentas.find(f => f.id === ferramentaComMesmoCodigo.ferramentaId);
                toast.error('❌ Já existe uma ferramenta com este código no kit!', {
                    description: `Código "${codigoFerramenta}" já está sendo usado por "${ferramentaExistente?.nome || 'outra ferramenta'}"`
                });
                return;
            }

            const estoqueDisponivel = ferramenta.quantidade || 0;
            if (estoqueDisponivel <= 0) {
                toast.error(`❌ ${ferramenta.nome} não possui estoque disponível!`);
                return;
            }
            
            // Adicionar à seleção temporária (só será salvo ao clicar em Salvar Alterações)
            setFerramentasSelecionadas([...ferramentasSelecionadas, ferramentaId]);
            
            // Se é um item que estava marcado para remover, restaurar dados originais do kit
            if (kitEditando && itensParaRemover.includes(ferramentaId)) {
                const itemOriginal = kitEditando.itens.find(i => i.ferramentaId === ferramentaId);
                if (itemOriginal) {
                    setFormKit({
                        ...formKit,
                        itens: [
                            ...formKit.itens.filter(item => item.ferramentaId !== ferramentaId),
                            {
                                ferramentaId,
                                quantidade: itemOriginal.quantidade,
                                estadoEntrega: itemOriginal.estadoEntrega,
                                observacoes: itemOriginal.observacoes || ''
                            }
                        ]
                    });
                    // Remover da lista de itens para remover
                    setItensParaRemover(itensParaRemover.filter(id => id !== ferramentaId));
                }
            } else {
                // Novo item - adicionar normalmente
                setFormKit({
                    ...formKit,
                    itens: [
                        ...formKit.itens,
                        {
                            ferramentaId,
                            quantidade: 1,
                            estadoEntrega: 'Novo',
                            observacoes: ''
                        }
                    ]
                });
            }
        }
    };

    const handleAtualizarItemKit = (ferramentaId: string, field: string, value: any) => {
        setFormKit({
            ...formKit,
            itens: formKit.itens.map(item =>
                item.ferramentaId === ferramentaId
                    ? { ...item, [field]: value }
                    : item
            )
        });
    };

    // Remover item que está apenas selecionado (não foi salvo ainda)
    const handleRemoverItemDoKit = (ferramentaId: string) => {
        // Verificar se é um item já salvo no kit ou apenas selecionado
        if (kitEditando && kitEditando.itens.some(i => i.ferramentaId === ferramentaId)) {
            // É um item já salvo - marcar para remoção (será removido ao salvar)
            handleRemoverItemExistenteDoKit(ferramentaId);
        } else {
            // É apenas um item selecionado temporariamente - remover da seleção sem afetar estoque
            setFerramentasSelecionadas(ferramentasSelecionadas.filter(id => id !== ferramentaId));
            setFormKit({
                ...formKit,
                itens: formKit.itens.filter(item => item.ferramentaId !== ferramentaId)
            });
            toast.success('Item removido da seleção');
        }
    };

    // Remover item já salvo no kit (marcar para remoção ao salvar)
    const handleRemoverItemExistenteDoKit = (ferramentaId: string) => {
        if (!kitEditando) return;

        // Adicionar à lista de itens para remover
        if (!itensParaRemover.includes(ferramentaId)) {
            setItensParaRemover([...itensParaRemover, ferramentaId]);
        }

        // Remover da lista de itens do formKit (para que não seja enviado ao salvar)
        setFormKit({
            ...formKit,
            itens: formKit.itens.filter(item => item.ferramentaId !== ferramentaId)
        });

        toast.success('Item será removido ao salvar as alterações');
    };

    const handleExcluirKit = (kit: KitFerramenta) => {
        setKitToDelete(kit);
        setShowDeleteKitDialog(true);
    };

    const confirmDeleteKit = async () => {
        if (!kitToDelete) return;

        try {
            const response = await axiosApiService.delete(`/api/kits-ferramenta/${kitToDelete.id}`);
            if (response.success) {
                toast.success('✅ Kit excluído com sucesso!');
                loadKits();
                loadFerramentas(); // Recarregar ferramentas para atualizar estoque
            } else {
                toast.error('❌ Erro ao excluir kit: ' + (response.error || 'Erro desconhecido'));
            }
        } catch (error: any) {
            console.error('Erro ao excluir kit:', error);
            toast.error('❌ Erro ao excluir kit: ' + (error?.response?.data?.error || error?.message));
        } finally {
            setShowDeleteKitDialog(false);
            setKitToDelete(null);
        }
    };

    const handleFotoKitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFotoKitEntregue(file);
            
            // Criar preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setFotoKitPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGerarRecibo = async (kit: KitFerramenta) => {
        try {
            toast.loading('Gerando recibo...', { id: 'recibo-loading' });

            const response = await axiosApiService.get(`/api/kits-ferramenta/${kit.id}/recibo`);
            const html =
                response.success && response.data && typeof response.data === 'string'
                    ? response.data
                    : null;

            if (!html) {
                toast.error('Erro ao gerar recibo: ' + (response.error || 'Resposta inválida'), {
                    id: 'recibo-loading',
                });
                return;
            }

            const novaJanela = window.open('', '_blank');
            if (!novaJanela) {
                toast.error('Não foi possível abrir nova aba. Verifique o bloqueador de pop-ups.', {
                    id: 'recibo-loading',
                });
                return;
            }

            novaJanela.document.write(html);
            novaJanela.document.close();
            toast.success('Recibo gerado com sucesso!', { id: 'recibo-loading' });
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } }; message?: string };
            console.error('Erro ao gerar recibo:', error);
            toast.error('Erro ao gerar recibo: ' + (err?.response?.data?.error || err?.message), {
                id: 'recibo-loading',
            });
        }
    };

    const handleVisualizarFerramenta = (ferramenta: Ferramenta) => {
        setFerramentaVisualizando(ferramenta);
        setModalVisualizarFerramenta(true);
    };

    const handleVisualizarKit = (kit: KitFerramenta) => {
        setKitVisualizando(kit);
        setModalVisualizarKit(true);
    };

    const handleEditarKit = (kit: KitFerramenta) => {
        setKitEditando(kit);
        // Inicializar formKit com itens existentes
        setFormKit({
            nome: kit.nome,
            descricao: kit.descricao || '',
            eletricistaId: kit.eletricistaId,
            eletricistaNome: kit.eletricistaNome,
            dataEntrega: new Date(kit.dataEntrega).toISOString().split('T')[0],
            observacoes: kit.observacoes || '',
            itens: kit.itens.map(item => ({
                ferramentaId: item.ferramentaId,
                quantidade: item.quantidade,
                estadoEntrega: item.estadoEntrega,
                observacoes: item.observacoes || ''
            }))
        });
        // Inicializar selecionadas com os IDs dos itens existentes
        setFerramentasSelecionadas(kit.itens.map(item => item.ferramentaId));
        // Limpar lista de itens para remover
        setItensParaRemover([]);
        setFotoKitPreview(kit.imagemUrl || '');
        setModalEditarKit(true);
    };

    const handleSalvarEdicaoKit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!kitEditando) return;

        try {
            // Upload da foto se houver nova
            let imagemUrl = kitEditando.imagemUrl;
            if (fotoKitEntregue) {
                const formData = new FormData();
                formData.append('imagem', fotoKitEntregue);
                
                const uploadResponse = await axiosApiService.post('/api/kits-ferramenta/upload-foto', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                
                if (uploadResponse.success && (uploadResponse.data as any)?.url) {
                    imagemUrl = (uploadResponse.data as any).url;
                }
            }

            // Preparar TODOS os itens que devem permanecer no kit:
            // - Itens existentes que NÃO foram marcados para remoção (restaurar do kit original se necessário)
            // - Novos itens que foram selecionados
            const itensExistentesIds = new Set(kitEditando.itens.map(i => i.ferramentaId));
            
            // Primeiro, incluir itens existentes que NÃO foram marcados para remoção (usar formKit para refletir observação/quantidade/estado editados)
            const itensExistentesNaoRemovidos = formKit.itens
                .filter(item => itensExistentesIds.has(item.ferramentaId) && !itensParaRemover.includes(item.ferramentaId))
                .map(item => ({
                    ferramentaId: item.ferramentaId,
                    quantidade: item.quantidade,
                    estadoEntrega: item.estadoEntrega,
                    observacoes: item.observacoes ?? ''
                }));
            
            // Depois, incluir novos itens (que não existem no kit original)
            const novosItens = formKit.itens.filter(item => !itensExistentesIds.has(item.ferramentaId));
            
            // Combinar ambos e garantir que não há duplicados
            const itensFinais = [...itensExistentesNaoRemovidos, ...novosItens].filter((item, index, self) => 
                index === self.findIndex(i => i.ferramentaId === item.ferramentaId)
            );

            // Validar que não há itens duplicados usando o código da ferramenta
            const codigosFerramentas = itensFinais.map(item => {
                const ferramenta = ferramentas.find(f => f.id === item.ferramentaId);
                return ferramenta?.codigo;
            }).filter(Boolean);
            const codigosUnicos = new Set(codigosFerramentas);
            if (codigosFerramentas.length !== codigosUnicos.size) {
                const codigosDuplicados = codigosFerramentas.filter((codigo, index) => codigosFerramentas.indexOf(codigo) !== index);
                toast.error('❌ Erro: Existem ferramentas com códigos duplicados no kit. Remova duplicatas antes de salvar.', {
                    description: `Códigos duplicados: ${[...new Set(codigosDuplicados)].join(', ')}`
                });
                return;
            }

            // Validar que há pelo menos um item
            if (itensFinais.length === 0) {
                toast.error('❌ Adicione pelo menos uma ferramenta ao kit!');
                return;
            }

            const response = await axiosApiService.put(`/api/kits-ferramenta/${kitEditando.id}`, {
                nome: formKit.nome,
                descricao: formKit.descricao,
                imagemUrl,
                observacoes: formKit.observacoes,
                itens: itensFinais // Enviar TODOS os itens que devem permanecer (backend remove os que não estão na lista)
            });

            if (response.success) {
                toast.success('✅ Kit atualizado com sucesso!');
                setModalEditarKit(false);
                setKitEditando(null);
                setFotoKitEntregue(null);
                setFotoKitPreview('');
                setItensParaRemover([]);
                setFerramentasSelecionadas([]);
                loadKits();
                loadFerramentas(); // Recarregar ferramentas para atualizar estoque
                loadEstatisticas();
            } else {
                toast.error('❌ Erro ao atualizar kit: ' + (response.error || 'Erro desconhecido'));
            }
        } catch (error: any) {
            console.error('Erro ao atualizar kit:', error);
            toast.error('❌ Erro ao atualizar kit: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleEletricistaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const eletricistaId = e.target.value;
        const eletricista = eletricistas.find(e => e.id === eletricistaId);
        
        setFormKit({
            ...formKit,
            eletricistaId,
            eletricistaNome: eletricista?.name || ''
        });
    };

    const handleEditarFerramenta = (ferramenta: Ferramenta) => {
        setFerramentaEditando(ferramenta);
        setFormFerramenta({
            nome: ferramenta.nome,
            codigo: ferramenta.codigo,
            categoria: ferramenta.categoria,
            marca: ferramenta.marca || '',
            modelo: ferramenta.modelo || '',
            descricao: ferramenta.descricao || '',
            valorCompra: ferramenta.valorCompra?.toString() || '',
            quantidade: ferramenta.quantidade?.toString() || '0',
            imagemUrl: ferramenta.imagemUrl || ''
        });
        setModalEditarFerramenta(true);
    };

    const handleDeletarFerramenta = (id: string) => {
        setFerramentaToDelete(id);
        setShowDeleteFerramentaDialog(true);
    };

    const confirmDeleteFerramenta = async () => {
        if (!ferramentaToDelete) return;

        try {
            const response = await axiosApiService.delete(`/api/ferramentas/${ferramentaToDelete}`);
            if (response.success) {
                toast.success('✅ Ferramenta desativada com sucesso!');
                loadFerramentas();
            }
        } catch (error) {
            console.error('Erro ao deletar ferramenta:', error);
            toast.error('❌ Erro ao desativar ferramenta');
        } finally {
            setShowDeleteFerramentaDialog(false);
            setFerramentaToDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando ferramentas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleSidebar} 
                        className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-white dark:hover:bg-dark-card hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    >
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Gestão de Ferramentas
                        </h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                            Gerencie ferramentas e kits para eletricistas
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'ferramentas' ? (
                        <button 
                            onClick={() => setModalNovaFerramenta(true)}
                            className="flex items-center justify-center bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl shadow-soft hover:bg-blue-700 transition-all duration-200"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Nova Ferramenta
                        </button>
                    ) : (
                        <button 
                            onClick={() => setModalNovoKit(true)}
                            className="flex items-center justify-center bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl shadow-soft hover:bg-blue-700 transition-all duration-200"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Montar Novo Kit
                        </button>
                    )}
                </div>
            </header>

            {/* Tabs */}
            <div className="mb-6">
                <div className="border-b border-gray-200 dark:border-dark-border">
                    <ScrollableRow as="nav" ariaLabel="Abas de ferramentas" className="-mb-px gap-8">
                        <button
                            onClick={() => setActiveTab('ferramentas')}
                            className={`${scrollableNavItemClasses} py-3 px-1 border-b-2 font-semibold text-sm transition-colors duration-200 flex items-center gap-2 ${
                                activeTab === 'ferramentas'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                            }`}
                        >
                            <WrenchIcon className="w-5 h-5" />
                            Ferramentas ({ferramentas.filter(f => f.ativo).length})
                        </button>
                        <button
                            onClick={() => setActiveTab('kits')}
                            className={`${scrollableNavItemClasses} py-3 px-1 border-b-2 font-semibold text-sm transition-colors duration-200 flex items-center gap-2 ${
                                activeTab === 'kits'
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                            }`}
                        >
                            <BriefcaseIcon className="w-5 h-5" />
                            Kits ({kits.filter(k => k.ativo).length})
                        </button>
                    </ScrollableRow>
                </div>
            </div>

            {/* Estatísticas - Aba Ferramentas */}
            {activeTab === 'ferramentas' && estatisticas && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border p-6 rounded-2xl shadow-soft hover:shadow-medium transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total de Ferramentas</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{estatisticas.totalFerramentas || 0}</p>
                            </div>
                            <WrenchIcon className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border p-6 rounded-2xl shadow-soft hover:shadow-medium transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Em Estoque</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{estatisticas.totalEmEstoque || 0}</p>
                            </div>
                            <svg className="w-8 h-8 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border p-6 rounded-2xl shadow-soft hover:shadow-medium transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Em Uso</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{estatisticas.totalFerramentasEmUso || 0}</p>
                            </div>
                            <BriefcaseIcon className="w-8 h-8 text-violet-500 dark:text-violet-400" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border p-6 rounded-2xl shadow-soft hover:shadow-medium transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Valor Total</p>
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">R$ {(estatisticas.valorTotalEstoque || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <svg className="w-8 h-8 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
            )}

            {/* Filtros */}
            {activeTab === 'ferramentas' && (
                <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-soft border border-gray-100 dark:border-dark-border mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, código, categoria, marca..."
                                value={pesquisa}
                                onChange={(e) => setPesquisa(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <select
                            value={filtroCategoria}
                            onChange={(e) => setFiltroCategoria(e.target.value as any)}
                            className="px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="Todos">Todas as Categorias</option>
                            {categoriasFerramenta.map((categoria) => (
                                <option key={categoria} value={categoria}>
                                    {categoria}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filtroEstoque}
                            onChange={(e) => setFiltroEstoque(e.target.value as any)}
                            className="px-4 py-3 border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="Todos">Todos os Estoques</option>
                            <option value="Disponivel">Disponível</option>
                            <option value="SemEstoque">Sem Estoque</option>
                        </select>
                    </div>

                    <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Exibindo <span className="font-bold text-gray-900 dark:text-white">{ferramentasFiltradas.filter(f => f.ativo).length}</span> de <span className="font-bold text-gray-900 dark:text-white">{ferramentas.filter(f => f.ativo).length}</span> ferramentas
                        </p>
                        <ViewToggle view={viewMode} onViewChange={handleViewModeChange} />
                    </div>
                </div>
            )}

            {/* Conteúdo das Tabs */}
            {activeTab === 'ferramentas' && (
                <>
                    {ferramentasFiltradas.filter(f => f.ativo).length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-16 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <WrenchIcon className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                {pesquisa ? 'Nenhuma ferramenta encontrada' : 'Nenhuma ferramenta cadastrada'}
                            </h3>
                            <p className="text-gray-500 mb-6">
                                {pesquisa ? 'Tente ajustar os filtros de busca' : 'Comece cadastrando suas ferramentas'}
                            </p>
                            {!pesquisa && (
                                <button 
                                    onClick={() => setModalNovaFerramenta(true)}
                                    className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                                >
                                    <PlusIcon className="w-5 h-5 inline mr-2" />
                                    Cadastrar Primeira Ferramenta
                                </button>
                            )}
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">{
                            ferramentasFiltradas.filter(f => f.ativo).map((ferramenta) => (
                                <div key={ferramenta.id} className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium hover:border-blue-300 transition-all duration-200">
                                    {ferramenta.imagemUrl && (
                                        <img 
                                            src={getUploadUrl(ferramenta.imagemUrl)} 
                                            alt={ferramenta.nome}
                                            className="w-full h-40 object-cover rounded-lg mb-4"
                                        />
                                    )}
                                    
                                    {/* Header do Card */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg text-gray-900 mb-1">{ferramenta.nome}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="px-3 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-800 ring-1 ring-blue-200">
                                                    {ferramenta.categoria}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Informações */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <span>🔢</span>
                                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{ferramenta.codigo}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span>📦</span>
                                            <span className={`font-bold ${
                                                (ferramenta.quantidade || 0) > 0 
                                                    ? 'text-green-700' 
                                                    : 'text-red-600'
                                            }`}>
                                                Estoque: {ferramenta.quantidade || 0} unidade(s)
                                            </span>
                                        </div>
                                        {ferramenta.valorCompra && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <span>💰</span>
                                                <span className="font-bold text-green-700">
                                                    R$ {ferramenta.valorCompra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
                                        {ferramenta.marca && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <span>🏭</span>
                                                <span>{ferramenta.marca}</span>
                                            </div>
                                        )}
                                        {ferramenta.modelo && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <span>📦</span>
                                                <span>{ferramenta.modelo}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Botões de Ação */}
                                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                                        <button
                                            onClick={() => handleVisualizarFerramenta(ferramenta)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                            Ver
                                        </button>
                                        <button
                                            onClick={() => handleEditarFerramenta(ferramenta)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-semibold"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeletarFerramenta(ferramenta.id)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            ))
                        }
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl overflow-hidden shadow-soft">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Ferramenta</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Código</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Categoria</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Marca/Modelo</th>
                                            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Estoque</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Valor</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
                                        {ferramentasFiltradas.filter(f => f.ativo).map((ferramenta) => (
                                            <tr key={ferramenta.id} className="hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        {ferramenta.imagemUrl && (
                                                            <img 
                                                                src={getUploadUrl(ferramenta.imagemUrl)} 
                                                                alt={ferramenta.nome}
                                                                className="w-10 h-10 object-cover rounded-lg"
                                                            />
                                                        )}
                                                        <div className="font-bold text-gray-900">{ferramenta.nome}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="font-mono text-sm text-gray-600">{ferramenta.codigo}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm bg-blue-100 text-blue-800 ring-1 ring-blue-200">
                                                        {ferramenta.categoria}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-600">
                                                        {ferramenta.marca && <div>🏭 {ferramenta.marca}</div>}
                                                        {ferramenta.modelo && <div>📦 {ferramenta.modelo}</div>}
                                                        {!ferramenta.marca && !ferramenta.modelo && <span className="text-gray-400">-</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                                                        (ferramenta.quantidade || 0) > 0 
                                                            ? 'bg-green-100 text-green-800 ring-1 ring-green-200' 
                                                            : 'bg-red-100 text-red-800 ring-1 ring-red-200'
                                                    }`}>
                                                        {ferramenta.quantidade || 0}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {ferramenta.valorCompra ? (
                                                        <span className="font-bold text-green-700">
                                                            R$ {ferramenta.valorCompra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleVisualizarFerramenta(ferramenta)}
                                                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditarFerramenta(ferramenta)}
                                                            className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-semibold"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletarFerramenta(ferramenta.id)}
                                                            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
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
                        </div>
                    )}
                </>
            )}

            {/* Filtros de Kits */}
            {activeTab === 'kits' && (
                <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 mb-6">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome do kit, eletricista, descrição..."
                                value={pesquisaKit}
                                onChange={(e) => setPesquisaKit(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
                        <p className="text-sm text-gray-600">
                            Exibindo <span className="font-bold text-gray-900">{kitsFiltrados.filter(k => k.ativo).length}</span> de <span className="font-bold text-gray-900">{kits.filter(k => k.ativo).length}</span> kits
                        </p>
                        <ViewToggle view={viewModeKit} onViewChange={handleViewModeKitChange} />
                    </div>
                </div>
            )}

            {activeTab === 'kits' && (
                <>
                    {kitsFiltrados.filter(k => k.ativo).length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-16 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <BriefcaseIcon className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhum kit montado</h3>
                            <p className="text-gray-500 mb-6">Crie kits de ferramentas para os eletricistas</p>
                            <button 
                                onClick={() => setModalNovoKit(true)}
                                className="bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                            >
                                <PlusIcon className="w-5 h-5 inline mr-2" />
                                Montar Primeiro Kit
                            </button>
                        </div>
                    ) : viewModeKit === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{
                            kitsFiltrados.filter(k => k.ativo).map((kit) => (
                                <div key={kit.id} className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-4 shadow-soft hover:shadow-medium transition-all duration-200">
                                    {/* Header do Card */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-base text-gray-900 dark:text-white mb-1 truncate">{kit.nome}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                    Kit
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Informações */}
                                    <div className="space-y-1.5 mb-3">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <span>👤</span>
                                            <span className="font-semibold text-gray-900 dark:text-white truncate">{kit.eletricistaNome}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <span>📅</span>
                                            <span>Entregue em: {new Date(kit.dataEntrega).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <span>🔧</span>
                                            <span>{kit.itens.length} ferramenta(s)</span>
                                        </div>
                                    </div>

                                    {kit.descricao && (
                                        <div className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg p-2.5 mb-3">
                                            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{kit.descricao}</p>
                                        </div>
                                    )}

                                    {/* Preview de Itens */}
                                    <div className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg p-2.5 mb-3">
                                        <h4 className="text-xs font-semibold text-gray-700 mb-2">Ferramentas do Kit:</h4>
                                        <div className="space-y-1">
                                            {kit.itens.slice(0, 2).map((item) => (
                                                <div key={item.id} className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-700">{item.ferramenta.nome}</span>
                                                    <span className="text-gray-500">x{item.quantidade}</span>
                                                </div>
                                            ))}
                                            {kit.itens.length > 2 && (
                                                <p className="text-xs text-gray-500 italic">
                                                    + {kit.itens.length - 2} mais...
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Botões de Ação */}
                                    <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-100 dark:border-dark-border">
                                        <button
                                            onClick={() => handleVisualizarKit(kit)}
                                            className="flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-xs font-semibold"
                                            title="Ver kit"
                                            aria-label="Ver kit"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleEditarKit(kit)}
                                            className="flex items-center justify-center gap-1 px-2 py-1.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors text-xs font-semibold"
                                            title="Editar kit"
                                            aria-label="Editar kit"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleGerarRecibo(kit)}
                                            className="flex items-center justify-center gap-1 px-2 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-xs font-semibold"
                                            title="Gerar PDF do kit"
                                            aria-label="Gerar PDF do kit"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleExcluirKit(kit)}
                                            className="flex items-center justify-center gap-1 px-2 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-xs font-semibold"
                                            title="Excluir kit"
                                            aria-label="Excluir kit"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        }
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Kit</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Eletricista</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Data Entrega</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Ferramentas</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {kitsFiltrados.filter(k => k.ativo).map((kit) => (
                                            <tr key={kit.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{kit.nome}</p>
                                                        {kit.descricao && (
                                                            <p className="text-xs text-gray-500 mt-1">{kit.descricao}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-semibold text-gray-900">{kit.eletricistaNome}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-gray-700">{new Date(kit.dataEntrega).toLocaleDateString('pt-BR')}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-3 py-1 text-xs font-bold rounded-lg bg-green-100 text-green-800">
                                                        {kit.itens.length} itens
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() => handleVisualizarKit(kit)}
                                                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                                            title="Ver Detalhes"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditarKit(kit)}
                                                            className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-semibold"
                                                            title="Editar Kit"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleGerarRecibo(kit)}
                                                            className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-semibold"
                                                            title="Gerar PDF"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleExcluirKit(kit)}
                                                            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
                                                            title="Excluir kit"
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
                        </div>
                    )}
                </>
            )}

            {/* Modal Nova Ferramenta */}
            {modalNovaFerramenta && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="modal-header">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">🔧 Nova Ferramenta</h2>
                            <button
                                onClick={() => setModalNovaFerramenta(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSalvarFerramenta} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Nome *
                                    </label>
                                    <input
                                        type="text"
                                        value={formFerramenta.nome}
                                        onChange={(e) => setFormFerramenta({...formFerramenta, nome: e.target.value})}
                                        required
                                        className="input-field"
                                        placeholder="Ex: Alicate Universal"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Código *
                                    </label>
                                    <input
                                        type="text"
                                        value={formFerramenta.codigo}
                                        onChange={(e) => setFormFerramenta({...formFerramenta, codigo: e.target.value})}
                                        required
                                        className="input-field"
                                        placeholder="Ex: FER-001"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Categoria *
                                    </label>
                                    <select
                                        value={formFerramenta.categoria}
                                        onChange={(e) => setFormFerramenta({...formFerramenta, categoria: e.target.value})}
                                        required
                                        className="select-field"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="Alicate">Alicate</option>
                                        <option value="Chave">Chave</option>
                                        <option value="Multímetro">Multímetro</option>
                                        <option value="Furadeira">Furadeira</option>
                                        <option value="Parafusadeira">Parafusadeira</option>
                                        <option value="Escada">Escada</option>
                                        <option value="EPI">EPI</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Valor de Compra
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formFerramenta.valorCompra}
                                        onChange={(e) => setFormFerramenta({...formFerramenta, valorCompra: e.target.value})}
                                        className="input-field"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Quantidade em Estoque *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formFerramenta.quantidade}
                                        onChange={(e) => setFormFerramenta({...formFerramenta, quantidade: e.target.value})}
                                        required
                                        className="input-field"
                                        placeholder="0"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Quantidade disponível no estoque</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Marca
                                    </label>
                                    <input
                                        type="text"
                                        value={formFerramenta.marca}
                                        onChange={(e) => setFormFerramenta({...formFerramenta, marca: e.target.value})}
                                        className="input-field"
                                        placeholder="Ex: Tramontina"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Modelo
                                    </label>
                                    <input
                                        type="text"
                                        value={formFerramenta.modelo}
                                        onChange={(e) => setFormFerramenta({...formFerramenta, modelo: e.target.value})}
                                        className="input-field"
                                        placeholder="Ex: HD-8"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Descrição
                                </label>
                                <textarea
                                    value={formFerramenta.descricao}
                                    onChange={(e) => setFormFerramenta({...formFerramenta, descricao: e.target.value})}
                                    className="input-field"
                                    rows={3}
                                    placeholder="Descrição detalhada da ferramenta..."
                                />
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setModalNovaFerramenta(false)}
                                    className="btn-secondary"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                >
                                    Cadastrar Ferramenta
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Editar Ferramenta */}
            {modalEditarFerramenta && ferramentaEditando && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="modal-header bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-700 dark:to-blue-600">
                            <div className="flex justify-between items-center w-full">
                                <h2 className="text-2xl font-bold text-white">✏️ Editar Ferramenta</h2>
                                <button
                                    onClick={() => {
                                        setModalEditarFerramenta(false);
                                        setFerramentaEditando(null);
                                    }}
                                    className="text-white/80 hover:text-white transition-colors"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSalvarFerramenta} className="modal-body space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Nome *</label>
                                    <input
                                        type="text"
                                        value={formFerramenta.nome}
                                        onChange={(e) => setFormFerramenta({...formFerramenta, nome: e.target.value})}
                                        required
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Código *</label>
                                    <input
                                        type="text"
                                        value={formFerramenta.codigo}
                                        onChange={(e) => setFormFerramenta({...formFerramenta, codigo: e.target.value})}
                                        required
                                        className="input-field"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Categoria *</label>
                                    <select
                                        value={formFerramenta.categoria}
                                        onChange={(e) => setFormFerramenta({...formFerramenta, categoria: e.target.value})}
                                        required
                                        className="select-field"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="Alicate">Alicate</option>
                                        <option value="Chave">Chave</option>
                                        <option value="Multímetro">Multímetro</option>
                                        <option value="Furadeira">Furadeira</option>
                                        <option value="Parafusadeira">Parafusadeira</option>
                                        <option value="Escada">Escada</option>
                                        <option value="EPI">EPI</option>
                                        <option value="Outros">Outros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Valor de Compra</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formFerramenta.valorCompra}
                                        onChange={(e) => setFormFerramenta({...formFerramenta, valorCompra: e.target.value})}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Quantidade em Estoque *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formFerramenta.quantidade}
                                        onChange={(e) => setFormFerramenta({...formFerramenta, quantidade: e.target.value})}
                                        required
                                        className="input-field"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">Quantidade disponível no estoque</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Marca</label>
                                    <input
                                        type="text"
                                        value={formFerramenta.marca}
                                        onChange={(e) => setFormFerramenta({...formFerramenta, marca: e.target.value})}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Modelo</label>
                                    <input
                                        type="text"
                                        value={formFerramenta.modelo}
                                        onChange={(e) => setFormFerramenta({...formFerramenta, modelo: e.target.value})}
                                        className="input-field"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Descrição</label>
                                <textarea
                                    value={formFerramenta.descricao}
                                    onChange={(e) => setFormFerramenta({...formFerramenta, descricao: e.target.value})}
                                    className="input-field"
                                    rows={3}
                                />
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setModalEditarFerramenta(false);
                                        setFerramentaEditando(null);
                                    }}
                                    className="btn-secondary"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                >
                                    Atualizar Ferramenta
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Montar Kit */}
            {modalNovoKit && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="modal-header bg-gradient-to-r from-green-600 to-green-500">
                            <div>
                                <h2 className="text-2xl font-bold text-white">📦 Montar Kit de Ferramentas</h2>
                                <p className="text-green-100 text-sm mt-1">Selecione ferramentas e atribua a um eletricista</p>
                            </div>
                            <button
                                onClick={() => setModalNovoKit(false)}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSalvarKit} className="p-6 space-y-6">
                            {/* Informações do Kit */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <h3 className="font-bold text-blue-900 mb-4">📋 Informações do Kit</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Nome do Kit *
                                        </label>
                                        <input
                                            type="text"
                                            value={formKit.nome}
                                            onChange={(e) => setFormKit({...formKit, nome: e.target.value})}
                                            required
                                            className="input-field"
                                            placeholder="Ex: Kit Eletricista Completo"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Eletricista *
                                        </label>
                                        <select
                                            value={formKit.eletricistaId}
                                            onChange={handleEletricistaChange}
                                            required
                                            className="select-field"
                                        >
                                            <option value="">Selecione um eletricista</option>
                                            {eletricistas.map(e => (
                                                <option key={e.id} value={e.id}>{e.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Data de Entrega *
                                        </label>
                                        <input
                                            type="date"
                                            value={formKit.dataEntrega}
                                            onChange={(e) => setFormKit({...formKit, dataEntrega: e.target.value})}
                                            required
                                            className="input-field"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Descrição
                                        </label>
                                        <input
                                            type="text"
                                            value={formKit.descricao}
                                            onChange={(e) => setFormKit({...formKit, descricao: e.target.value})}
                                            className="input-field"
                                            placeholder="Opcional"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Seleção de Ferramentas */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-4">🔧 Selecionar Ferramentas ({ferramentasSelecionadas.length})</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200">
                                    {ferramentas.filter(f => f.ativo).map((ferramenta) => {
                                        const isSelected = ferramentasSelecionadas.includes(ferramenta.id);
                                        const itemKit = formKit.itens.find(i => i.ferramentaId === ferramenta.id);

                                        return (
                                            <div key={ferramenta.id} className="bg-white border-2 rounded-xl p-4">
                                                <div
                                                    className={`flex items-start gap-3 cursor-pointer ${isSelected ? 'mb-3' : ''}`}
                                                    onClick={() => handleAdicionarFerramentaAoKit(ferramenta.id)}
                                                >
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                        isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300 bg-white'
                                                    }`}>
                                                        {isSelected && (
                                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-900">{ferramenta.nome}</p>
                                                        <p className="text-xs text-gray-500">{ferramenta.codigo} - {ferramenta.categoria}</p>
                                                        <p className={`text-xs font-semibold mt-1 ${
                                                            (ferramenta.quantidade || 0) > 0 
                                                                ? 'text-green-600' 
                                                                : 'text-red-600'
                                                        }`}>
                                                            Estoque: {ferramenta.quantidade || 0} unidade(s)
                                                        </p>
                                                    </div>
                                                </div>

                                                {isSelected && itemKit && (
                                                    <>
                                                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200">
                                                            <div>
                                                                <label className="text-xs text-gray-600">
                                                                    Quantidade
                                                                    {(ferramenta.quantidade || 0) < itemKit.quantidade && (
                                                                        <span className="text-red-600 ml-1">⚠️</span>
                                                                    )}
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max={ferramenta.quantidade || 0}
                                                                    value={itemKit.quantidade}
                                                                    onChange={(e) => {
                                                                        const qty = parseInt(e.target.value) || 1;
                                                                        const maxQty = ferramenta.quantidade || 0;
                                                                        const finalQty = Math.max(1, Math.min(qty, maxQty));
                                                                        handleAtualizarItemKit(ferramenta.id, 'quantidade', finalQty);
                                                                    }}
                                                                    className={`input-field text-sm ${
                                                                        (ferramenta.quantidade || 0) < itemKit.quantidade 
                                                                            ? 'border-red-500 bg-red-50' 
                                                                            : ''
                                                                    }`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                {(ferramenta.quantidade || 0) < itemKit.quantidade && (
                                                                    <p className="text-xs text-red-600 mt-1">
                                                                        Máximo disponível: {ferramenta.quantidade || 0}
                                                                    </p>
                                                                )}
                                                                {(ferramenta.quantidade || 0) >= itemKit.quantidade && (ferramenta.quantidade || 0) > 0 && (
                                                                    <p className="text-xs text-green-600 mt-1">
                                                                        Disponível: {ferramenta.quantidade || 0}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-gray-600">Estado</label>
                                                                <select
                                                                    value={itemKit.estadoEntrega}
                                                                    onChange={(e) => handleAtualizarItemKit(ferramenta.id, 'estadoEntrega', e.target.value)}
                                                                    className="select-field text-sm"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <option value="Novo">Novo</option>
                                                                    <option value="Bom">Bom</option>
                                                                    <option value="Regular">Regular</option>
                                                                    <option value="Desgastado">Desgastado</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="pt-2">
                                                            <label className="text-xs text-gray-600 font-medium block mb-1">💡 Observação (opcional)</label>
                                                            <input
                                                                type="text"
                                                                value={itemKit.observacoes ?? ''}
                                                                onChange={(e) => handleAtualizarItemKit(ferramenta.id, 'observacoes', e.target.value)}
                                                                className="input-field text-sm w-full py-1.5"
                                                                placeholder="Ex.: motivo da inclusão no kit..."
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoverItemDoKit(ferramenta.id);
                                                            }}
                                                            className="w-full mt-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-semibold flex items-center justify-center gap-1"
                                                        >
                                                            <TrashIcon className="w-3 h-3" />
                                                            Remover do Kit
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Observações */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Observações
                                </label>
                                <textarea
                                    value={formKit.observacoes}
                                    onChange={(e) => setFormKit({...formKit, observacoes: e.target.value})}
                                    className="input-field"
                                    rows={3}
                                    placeholder="Observações sobre o kit, termo de responsabilidade, etc..."
                                />
                            </div>

                            {/* Upload de Foto do Kit */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    📷 Foto do Kit Entregue
                                </label>
                                <div className="flex items-center gap-4">
                                    <label className="flex-1 cursor-pointer">
                                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-blue-500 hover:bg-blue-50 transition-all">
                                            <div className="flex items-center justify-center gap-2">
                                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-sm text-gray-600">
                                                    {fotoKitEntregue ? fotoKitEntregue.name : 'Clique para selecionar foto'}
                                                </span>
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFotoKitChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                {fotoKitPreview && (
                                    <div className="mt-3">
                                        <img 
                                            src={fotoKitPreview} 
                                            alt="Preview do kit" 
                                            className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Assinatura do Eletricista */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <label className="block text-sm font-semibold text-amber-900 mb-2">
                                    ✍️ Assinatura do Eletricista
                                </label>
                                <p className="text-xs text-amber-700 mb-3">
                                    O eletricista deve assinar digitalmente confirmando o recebimento do kit
                                </p>
                                <div className="bg-white border-2 border-dashed border-amber-300 rounded-lg p-4">
                                    <input
                                        type="text"
                                        value={assinaturaEletricista}
                                        onChange={(e) => setAssinaturaEletricista(e.target.value)}
                                        className="input-field text-center font-signature text-2xl"
                                        placeholder="Digite o nome para assinar"
                                    />
                                    {assinaturaEletricista && (
                                        <div className="mt-3 text-center">
                                            <p className="font-signature text-4xl text-gray-700 border-t-2 border-gray-300 pt-2 inline-block px-8">
                                                {assinaturaEletricista}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-2">Assinatura Digital</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Resumo */}
                            {ferramentasSelecionadas.length > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                    <h4 className="font-bold text-green-900 mb-2">✅ Resumo do Kit</h4>
                                    <p className="text-sm text-green-800">
                                        {ferramentasSelecionadas.length} ferramenta(s) selecionada(s) para <strong>{formKit.eletricistaNome || 'eletricista'}</strong>
                                    </p>
                                </div>
                            )}

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setModalNovoKit(false)}
                                    className="btn-secondary"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-success"
                                >
                                    Montar Kit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Visualizar Ferramenta */}
            {modalVisualizarFerramenta && ferramentaVisualizando && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="modal-header bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-700 dark:to-blue-600">
                            <div className="flex justify-between items-center w-full">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">🔧 Detalhes da Ferramenta</h2>
                                    <p className="text-blue-100 dark:text-blue-200 text-sm mt-1">{ferramentaVisualizando.codigo}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setModalVisualizarFerramenta(false);
                                        setFerramentaVisualizando(null);
                                    }}
                                    className="text-white/80 hover:text-white transition-colors"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="modal-body space-y-6">
                            {ferramentaVisualizando.imagemUrl && (
                                <div className="text-center">
                                    <img 
                                        src={getUploadUrl(ferramentaVisualizando.imagemUrl)} 
                                        alt={ferramentaVisualizando.nome}
                                        className="max-w-full max-h-96 object-contain mx-auto rounded-xl border border-gray-200 dark:border-dark-border shadow-md"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Nome</p>
                                    <p className="font-bold text-gray-900 dark:text-dark-text">{ferramentaVisualizando.nome}</p>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Código</p>
                                    <p className="font-bold text-gray-900 dark:text-dark-text">{ferramentaVisualizando.codigo}</p>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                                    <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-1">Categoria</p>
                                    <p className="font-bold text-gray-900 dark:text-dark-text">{ferramentaVisualizando.categoria}</p>
                                </div>
                                {ferramentaVisualizando.marca && (
                                    <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                                        <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-1">Marca</p>
                                        <p className="font-bold text-gray-900 dark:text-dark-text">{ferramentaVisualizando.marca}</p>
                                    </div>
                                )}
                                {ferramentaVisualizando.modelo && (
                                    <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                                        <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-1">Modelo</p>
                                        <p className="font-bold text-gray-900 dark:text-dark-text">{ferramentaVisualizando.modelo}</p>
                                    </div>
                                )}
                                {ferramentaVisualizando.valorCompra && (
                                    <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-xl border border-green-200 dark:border-green-800">
                                        <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Valor de Compra</p>
                                        <p className="font-bold text-green-700 dark:text-green-300 text-xl">R$ {ferramentaVisualizando.valorCompra.toFixed(2)}</p>
                                    </div>
                                )}
                            </div>

                            {ferramentaVisualizando.descricao && (
                                <div className="bg-gray-50 dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border">
                                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary font-semibold mb-2">📝 Descrição</p>
                                    <p className="text-sm text-gray-700 dark:text-dark-text">{ferramentaVisualizando.descricao}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-dark-text-secondary">
                                <div>
                                    <p className="font-semibold mb-1">Criado em:</p>
                                    <p>{new Date(ferramentaVisualizando.createdAt).toLocaleString('pt-BR')}</p>
                                </div>
                                <div>
                                    <p className="font-semibold mb-1">Última atualização:</p>
                                    <p>{new Date(ferramentaVisualizando.updatedAt).toLocaleString('pt-BR')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                onClick={() => {
                                    setModalVisualizarFerramenta(false);
                                    setFerramentaVisualizando(null);
                                }}
                                className="btn-secondary"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={() => {
                                    setModalVisualizarFerramenta(false);
                                    handleEditarFerramenta(ferramentaVisualizando);
                                }}
                                className="btn-primary"
                            >
                                Editar Ferramenta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Visualizar Kit */}
            {modalVisualizarKit && kitVisualizando && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="modal-header bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-700 dark:to-blue-600">
                            <div className="flex justify-between items-center w-full">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">📦 Detalhes do Kit</h2>
                                    <p className="text-blue-100 dark:text-blue-200 text-sm mt-1">{kitVisualizando.nome}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setModalVisualizarKit(false);
                                        setKitVisualizando(null);
                                    }}
                                    className="text-white/80 hover:text-white transition-colors"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="modal-body space-y-6">
                            {/* Informações do Kit - destaque para Data de Entrega (criação) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-5 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-sm">
                                    <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold mb-1 flex items-center gap-2">👤 Eletricista</p>
                                    <p className="font-bold text-gray-900 dark:text-dark-text text-lg">{kitVisualizando.eletricistaNome}</p>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-5 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 shadow-sm">
                                    <p className="text-sm text-emerald-700 dark:text-emerald-300 font-semibold mb-1 flex items-center gap-2">📅 Data de entrega do kit (criação)</p>
                                    <p className="font-bold text-gray-900 dark:text-dark-text text-lg">
                                        {new Date(kitVisualizando.dataEntrega).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Data em que o kit foi entregue ao colaborador</p>
                                </div>
                            </div>

                            {kitVisualizando.descricao && (
                                <div className="bg-gray-50 dark:bg-dark-card p-5 rounded-xl border-2 border-gray-200 dark:border-dark-border">
                                    <p className="text-sm text-gray-700 dark:text-dark-text-secondary font-semibold mb-2 flex items-center gap-2">📝 Descrição do kit</p>
                                    <p className="text-sm text-gray-800 dark:text-dark-text">{kitVisualizando.descricao}</p>
                                </div>
                            )}

                            {/* Lista de Ferramentas - com Data de adição e Observação em evidência */}
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-dark-text text-lg mb-4 flex items-center gap-2">🔧 Ferramentas do Kit ({kitVisualizando.itens.length})</h3>
                                <div className="space-y-4">
                                    {kitVisualizando.itens.map((item, index) => (
                                        <div key={item.id} className="bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-xl p-5 shadow-sm hover:border-gray-300 dark:hover:border-dark-border transition-colors">
                                            <div className="flex items-start gap-4">
                                                <div className="w-11 h-11 bg-purple-600 dark:bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-900 dark:text-dark-text text-base mb-1">{item.ferramenta.nome}</h4>
                                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3">
                                                        Código: <span className="font-medium text-gray-800 dark:text-dark-text">{item.ferramenta.codigo}</span>
                                                        <span className="mx-2">|</span>
                                                        Categoria: <span className="font-medium text-gray-800 dark:text-dark-text">{item.ferramenta.categoria}</span>
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-600 dark:text-dark-text-secondary font-medium">Quantidade:</span>
                                                            <span className="font-bold text-gray-900 dark:text-dark-text">x{item.quantidade}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-600 dark:text-dark-text-secondary font-medium">Estado:</span>
                                                            <span className={`px-2.5 py-1 rounded font-semibold text-xs ${
                                                                item.estadoEntrega === 'Novo' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                                                item.estadoEntrega === 'Bom' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                                                                item.estadoEntrega === 'Regular' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                                                'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                                                            }`}>
                                                                {item.estadoEntrega}
                                                            </span>
                                                        </div>
                                                        {(item as any).dataAdicao && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-gray-600 dark:text-dark-text-secondary font-medium">Adicionado ao kit em:</span>
                                                                <span className="font-semibold text-gray-900 dark:text-dark-text">
                                                                    {new Date((item as any).dataAdicao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {item.observacoes ? (
                                                        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">💡 Observação</p>
                                                            <p className="text-sm text-gray-700 dark:text-dark-text">{item.observacoes}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-2 italic">Sem observação</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Foto do Kit Entregue */}
                            {kitVisualizando.imagemUrl && (
                                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                    <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-3">📷 Foto do Kit Entregue</h4>
                                    <img 
                                        src={getUploadUrl(kitVisualizando.imagemUrl)} 
                                        alt="Kit entregue"
                                        className="w-full max-h-96 object-contain rounded-lg border border-gray-200 dark:border-dark-border"
                                    />
                                </div>
                            )}

                            {kitVisualizando.observacoes && (
                                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-300 mb-2">💡 Observações</p>
                                    <p className="text-sm text-gray-700 dark:text-dark-text whitespace-pre-wrap">{kitVisualizando.observacoes}</p>
                                </div>
                            )}

                            {/* Assinatura do Eletricista */}
                            {kitVisualizando.assinatura && (
                                <div className="bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-6">
                                    <h4 className="font-bold text-purple-900 dark:text-purple-300 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        Assinatura do Eletricista
                                    </h4>
                                    <div className="bg-white dark:bg-dark-card border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg p-6 text-center">
                                        <p className="font-signature text-5xl text-purple-900 dark:text-purple-300 mb-2">{kitVisualizando.assinatura}</p>
                                        <p className="text-xs text-purple-700 dark:text-purple-400">✍️ Assinatura Digital de Recebimento</p>
                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                            Confirmado em: {new Date(kitVisualizando.dataEntrega).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Informações Adicionais */}
                            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-dark-text-secondary">
                                <div className="bg-gray-50 dark:bg-dark-card p-3 rounded-lg border border-gray-200 dark:border-dark-border">
                                    <p className="font-semibold mb-1">Criado em:</p>
                                    <p>{new Date(kitVisualizando.createdAt).toLocaleString('pt-BR')}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-dark-card p-3 rounded-lg border border-gray-200 dark:border-dark-border">
                                    <p className="font-semibold mb-1">ID do Kit:</p>
                                    <p className="font-mono text-xs">{kitVisualizando.id}</p>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                onClick={() => {
                                    setModalVisualizarKit(false);
                                    setKitVisualizando(null);
                                }}
                                className="btn-secondary"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={() => handleGerarRecibo(kitVisualizando)}
                                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Gerar Recibo (PDF)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Kit */}
            {modalEditarKit && kitEditando && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="modal-header bg-gradient-to-r from-yellow-600 to-yellow-500 dark:from-yellow-700 dark:to-yellow-600">
                            <div className="flex justify-between items-center w-full">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">✏️ Editar Kit de Ferramentas</h2>
                                    <p className="text-yellow-100 dark:text-yellow-200 text-sm mt-1">{kitEditando.nome}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setModalEditarKit(false);
                                        setKitEditando(null);
                                        setFotoKitEntregue(null);
                                        setFotoKitPreview('');
                                        setItensParaRemover([]);
                                        setFerramentasSelecionadas([]);
                                    }}
                                    className="text-white/80 hover:text-white transition-colors"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSalvarEdicaoKit} className="modal-body space-y-6">
                            {/* Informações do Kit */}
                            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-4">📋 Informações do Kit</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                            Nome do Kit *
                                        </label>
                                        <input
                                            type="text"
                                            value={formKit.nome}
                                            onChange={(e) => setFormKit({...formKit, nome: e.target.value})}
                                            required
                                            className="input-field"
                                            placeholder="Ex: Kit Eletricista Completo"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                            Eletricista
                                        </label>
                                        <input
                                            type="text"
                                            value={formKit.eletricistaNome}
                                            disabled
                                            className="input-field bg-gray-100 dark:bg-dark-card"
                                        />
                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">Eletricista não pode ser alterado</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                            Data de Entrega
                                        </label>
                                        <input
                                            type="date"
                                            value={formKit.dataEntrega}
                                            disabled
                                            className="input-field bg-gray-100 dark:bg-dark-card"
                                        />
                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">Data de entrega não pode ser alterada</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                            Descrição
                                        </label>
                                        <input
                                            type="text"
                                            value={formKit.descricao}
                                            onChange={(e) => setFormKit({...formKit, descricao: e.target.value})}
                                            className="input-field"
                                            placeholder="Opcional"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Itens Existentes */}
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-dark-text mb-4">
                                    🔧 Ferramentas Atuais ({kitEditando.itens.filter(item => !itensParaRemover.includes(item.ferramentaId)).length})
                                </h3>
                                <div className="bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-4 space-y-3 max-h-80 overflow-y-auto">
                                    {kitEditando.itens
                                        .filter(item => !itensParaRemover.includes(item.ferramentaId))
                                        .map((item) => {
                                            const formItem = formKit.itens.find(i => i.ferramentaId === item.ferramentaId);
                                            const observacaoAtual = formItem?.observacoes ?? item.observacoes ?? '';
                                            return (
                                        <div key={item.id} className={`bg-white dark:bg-dark-card border-2 rounded-lg p-4 border-gray-200 dark:border-dark-border`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 dark:text-dark-text">{item.ferramenta.nome}</p>
                                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{item.ferramenta.codigo} - Qtd: {item.quantidade}</p>
                                                    {(item as any).dataAdicao && (
                                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                                            Adicionado em: {new Date((item as any).dataAdicao).toLocaleDateString('pt-BR')}
                                                        </p>
                                                    )}
                                                    <label className="block text-xs font-semibold text-gray-600 dark:text-dark-text-secondary mt-2 mb-1">💡 Observação (opcional)</label>
                                                    <input
                                                        type="text"
                                                        value={observacaoAtual}
                                                        onChange={(e) => handleAtualizarItemKit(item.ferramentaId, 'observacoes', e.target.value)}
                                                        className="input-field text-sm py-1.5"
                                                        placeholder="Ex.: troca por defeito, complemento do kit..."
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                        {item.estadoEntrega}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoverItemExistenteDoKit(item.ferramentaId)}
                                                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-semibold flex items-center gap-1"
                                                        title="Remover do kit"
                                                    >
                                                        <TrashIcon className="w-3 h-3" />
                                                        Remover
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );})}
                                    {kitEditando.itens.filter(item => !itensParaRemover.includes(item.ferramentaId)).length === 0 && (
                                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary text-center py-4">Nenhuma ferramenta no kit</p>
                                    )}
                                </div>
                            </div>

                            {/* Adicionar Novos Itens */}
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-dark-text mb-4">➕ Adicionar Novas Ferramentas</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2 bg-gray-50 dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border">
                                    {ferramentas.filter(f => {
                                        // Mostrar apenas ferramentas que:
                                        // 1. Estão ativas
                                        // 2. NÃO estão no kit original OU estão marcadas para remoção
                                        const estaNoKitOriginal = kitEditando.itens.some(i => i.ferramentaId === f.id);
                                        const estaMarcadaParaRemover = itensParaRemover.includes(f.id);
                                        return f.ativo && (!estaNoKitOriginal || estaMarcadaParaRemover);
                                    }).map((ferramenta) => {
                                        const isSelected = ferramentasSelecionadas.includes(ferramenta.id);
                                        const itemKit = formKit.itens.find(i => i.ferramentaId === ferramenta.id);

                                        return (
                                            <div key={ferramenta.id} className="bg-white dark:bg-dark-card border-2 rounded-xl p-4 border-gray-200 dark:border-dark-border">
                                                <div
                                                    className={`flex items-start gap-3 cursor-pointer ${isSelected ? 'mb-3' : ''}`}
                                                    onClick={() => handleAdicionarFerramentaAoKit(ferramenta.id)}
                                                >
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                        isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300 bg-white'
                                                    }`}>
                                                        {isSelected && (
                                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-900">{ferramenta.nome}</p>
                                                        <p className="text-xs text-gray-500">{ferramenta.codigo} - {ferramenta.categoria}</p>
                                                        <p className={`text-xs font-semibold mt-1 ${
                                                            (ferramenta.quantidade || 0) > 0 
                                                                ? 'text-green-600' 
                                                                : 'text-red-600'
                                                        }`}>
                                                            Estoque: {ferramenta.quantidade || 0} unidade(s)
                                                        </p>
                                                    </div>
                                                </div>

                                                {isSelected && itemKit && (
                                                    <>
                                                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200">
                                                            <div>
                                                                <label className="text-xs text-gray-600">
                                                                    Quantidade
                                                                    {(ferramenta.quantidade || 0) < itemKit.quantidade && (
                                                                        <span className="text-red-600 ml-1">⚠️</span>
                                                                    )}
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max={ferramenta.quantidade || 0}
                                                                    value={itemKit.quantidade}
                                                                    onChange={(e) => {
                                                                        const qty = parseInt(e.target.value) || 1;
                                                                        const maxQty = ferramenta.quantidade || 0;
                                                                        const finalQty = Math.max(1, Math.min(qty, maxQty));
                                                                        handleAtualizarItemKit(ferramenta.id, 'quantidade', finalQty);
                                                                    }}
                                                                    className={`input-field text-sm ${
                                                                        (ferramenta.quantidade || 0) < itemKit.quantidade 
                                                                            ? 'border-red-500 bg-red-50' 
                                                                            : ''
                                                                    }`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                {(ferramenta.quantidade || 0) < itemKit.quantidade && (
                                                                    <p className="text-xs text-red-600 mt-1">
                                                                        Máximo disponível: {ferramenta.quantidade || 0}
                                                                    </p>
                                                                )}
                                                                {(ferramenta.quantidade || 0) >= itemKit.quantidade && (ferramenta.quantidade || 0) > 0 && (
                                                                    <p className="text-xs text-green-600 mt-1">
                                                                        Disponível: {ferramenta.quantidade || 0}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-gray-600">Estado</label>
                                                                <select
                                                                    value={itemKit.estadoEntrega}
                                                                    onChange={(e) => handleAtualizarItemKit(ferramenta.id, 'estadoEntrega', e.target.value)}
                                                                    className="select-field text-sm"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <option value="Novo">Novo</option>
                                                                    <option value="Bom">Bom</option>
                                                                    <option value="Regular">Regular</option>
                                                                    <option value="Desgastado">Desgastado</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="pt-2">
                                                            <label className="text-xs text-gray-600 dark:text-dark-text-secondary font-medium block mb-1">💡 Observação (data de adição será registrada ao salvar)</label>
                                                            <input
                                                                type="text"
                                                                value={itemKit.observacoes ?? ''}
                                                                onChange={(e) => handleAtualizarItemKit(ferramenta.id, 'observacoes', e.target.value)}
                                                                className="input-field text-sm w-full py-1.5"
                                                                placeholder="Ex.: complemento do kit, troca..."
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoverItemDoKit(ferramenta.id);
                                                            }}
                                                            className="w-full mt-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-semibold flex items-center justify-center gap-1"
                                                        >
                                                            <TrashIcon className="w-3 h-3" />
                                                            Remover do Kit
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Observações de Atualização */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    📝 Observações de Atualização
                                </label>
                                <textarea
                                    value={formKit.observacoes}
                                    onChange={(e) => setFormKit({...formKit, observacoes: e.target.value})}
                                    className="textarea-field"
                                    rows={3}
                                    placeholder="Descreva as alterações realizadas no kit..."
                                />
                            </div>

                            {/* Upload de Nova Foto */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    📷 Nova Foto do Kit
                                </label>
                                <div className="flex items-center gap-4">
                                    {fotoKitPreview && (
                                        <div className="w-32 h-32 border-2 border-gray-300 dark:border-dark-border rounded-lg overflow-hidden">
                                            <img 
                                                src={fotoKitPreview} 
                                                alt="Preview do kit" 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <label className="flex-1 cursor-pointer">
                                        <div className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-xl p-4 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all">
                                            <div className="flex items-center justify-center gap-2">
                                                <svg className="w-6 h-6 text-gray-400 dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                    {fotoKitEntregue ? fotoKitEntregue.name : 'Clique para selecionar nova foto'}
                                                </span>
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFotoKitChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Histórico */}
                            <div className="bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-4">
                                <h4 className="font-bold text-gray-900 dark:text-dark-text mb-3">📅 Histórico</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-dark-text-secondary font-semibold mb-1">Data de Criação</p>
                                        <p className="text-gray-900 dark:text-dark-text">{new Date(kitEditando.createdAt).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 dark:text-dark-text-secondary font-semibold mb-1">Última Atualização</p>
                                        <p className="text-gray-900 dark:text-dark-text">{new Date((kitEditando as any).updatedAt || kitEditando.createdAt).toLocaleString('pt-BR')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setModalEditarKit(false);
                                        setKitEditando(null);
                                        setFotoKitEntregue(null);
                                        setFotoKitPreview('');
                                        setItensParaRemover([]);
                                        setFerramentasSelecionadas([]);
                                    }}
                                    className="btn-secondary"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AlertDialog de Confirmação de Exclusão de Kit */}
            <AlertDialog
                isOpen={showDeleteKitDialog}
                onClose={() => {
                    setShowDeleteKitDialog(false);
                    setKitToDelete(null);
                }}
                onConfirm={confirmDeleteKit}
                title={`Excluir permanentemente o kit "${kitToDelete?.nome}"?`}
                message=""
                confirmText="Excluir Permanentemente"
                cancelText="Cancelar"
                variant="danger"
            >
                <div className="space-y-3">
                    <p className="text-gray-700 dark:text-gray-300">
                        Tem certeza que deseja excluir permanentemente o kit <strong>"{kitToDelete?.nome}"</strong>?
                    </p>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-200">
                        <p className="font-semibold mb-2">⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL e irá:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Excluir permanentemente o kit</li>
                            <li>Devolver todas as ferramentas ao estoque</li>
                            <li>Remover todas as informações relacionadas do banco de dados</li>
                        </ul>
                        <p className="mt-2 font-semibold">Esta ação não pode ser desfeita!</p>
                    </div>
                </div>
            </AlertDialog>

            {/* AlertDialog de Confirmação de Desativação de Ferramenta */}
            <AlertDialog
                isOpen={showDeleteFerramentaDialog}
                onClose={() => {
                    setShowDeleteFerramentaDialog(false);
                    setFerramentaToDelete(null);
                }}
                onConfirm={confirmDeleteFerramenta}
                title="Desativar Ferramenta"
                message="Tem certeza que deseja desativar esta ferramenta? Ela não aparecerá mais nas listagens, mas os dados serão preservados."
                confirmText="Desativar"
                cancelText="Cancelar"
                variant="warning"
            />
        </div>
    );
};

export default Ferramentas;

