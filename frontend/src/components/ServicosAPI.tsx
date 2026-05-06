import React, { useState, useMemo, useEffect } from 'react';
import { servicosService, type Servico as ServicoBase, type CreateServicoData as CreateServicoDataBase, type UpdateServicoData } from '../services/servicosService';
import ErrorMessage from './ErrorMessage';

// Extend types para incluir campos opcionais do componente
interface Servico extends ServicoBase {
    categoria?: string;
    tempoEstimado?: number;
    observacoes?: string;
}

interface CreateServicoData extends CreateServicoDataBase {
    categoria?: string;
    tempoEstimado?: number;
    observacoes?: string;
}

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
const WrenchScrewdriverIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
);
const ArrowPathIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
);
const Squares2X2Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
);
const ListBulletIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

interface ServicosProps {
    toggleSidebar: () => void;
}

const ServicosAPI: React.FC<ServicosProps> = ({ toggleSidebar }) => {
    const [servicos, setServicos] = useState<Servico[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFilter, setTipoFilter] = useState<string>('Todos');
    const [ativoFilter, setAtivoFilter] = useState<'Todos' | 'true' | 'false'>('Todos');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [servicoToEdit, setServicoToEdit] = useState<Servico | null>(null);
    const [servicoToView, setServicoToView] = useState<Servico | null>(null);
    const [servicoToDelete, setServicoToDelete] = useState<Servico | null>(null);

    const [formState, setFormState] = useState<CreateServicoData>({
        nome: '',
        codigo: '',
        descricao: '',
        tipo: '',
        preco: 0,
        unidade: 'hora'
    });

    // Mock data para demonstração (comentado - usando API real)
    const mockServicos: any[] = [
        {
            id: '1',
            nome: 'Instalação Elétrica Residencial',
            descricao: 'Instalação completa de sistema elétrico para residências até 100m²',
            tipo: 'Instalação',
            preco: 1200.00,
            unidade: 'projeto',
            tempoEstimado: 8,
            categoria: 'Elétrica',
            observacoes: 'Inclui projeto, materiais e mão de obra',
            ativo: true,
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z'
        },
        {
            id: '2',
            nome: 'Manutenção Preventiva de Quadros',
            descricao: 'Manutenção preventiva completa em quadros elétricos',
            tipo: 'Manutenção',
            preco: 150.00,
            unidade: 'hora',
            tempoEstimado: 2,
            categoria: 'Elétrica',
            observacoes: 'Verificação de conexões, limpeza e testes',
            ativo: true,
            createdAt: '2024-01-10T09:00:00Z',
            updatedAt: '2024-01-10T09:00:00Z'
        },
        {
            id: '3',
            nome: 'Projeto de Automação Industrial',
            descricao: 'Desenvolvimento de projeto completo de automação para indústria',
            tipo: 'Projeto',
            preco: 5000.00,
            unidade: 'projeto',
            tempoEstimado: 40,
            categoria: 'Automação',
            observacoes: 'Inclui levantamento, projeto e especificação técnica',
            ativo: false,
            createdAt: '2024-01-05T14:00:00Z',
            updatedAt: '2024-01-20T16:00:00Z'
        }
    ];

    const loadServicos = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Simulação de API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            setServicos(mockServicos);
        } catch (err) {
            setError('Erro ao carregar serviços');
            console.error('Erro ao carregar serviços:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadServicos();
    }, []);

    // Filtros
    const filteredServicos = useMemo(() => {
        let filtered = servicos;

        // Filtro por tipo
        if (tipoFilter !== 'Todos') {
            filtered = filtered.filter(servico => servico.tipo === tipoFilter);
        }

        // Filtro por status ativo
        if (ativoFilter !== 'Todos') {
            filtered = filtered.filter(servico => servico.ativo.toString() === ativoFilter);
        }

        // Filtro por busca
        if (searchTerm) {
            filtered = filtered.filter(servico =>
                servico.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                servico.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                servico.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return filtered;
    }, [servicos, tipoFilter, ativoFilter, searchTerm]);

    // Estatísticas
    const stats = useMemo(() => {
        const totalServicos = servicos.length;
        const ativos = servicos.filter(s => s.ativo).length;
        const inativos = servicos.filter(s => !s.ativo).length;
        const precoMedio = servicos.length > 0 ? servicos.reduce((acc, s) => acc + s.preco, 0) / servicos.length : 0;

        // Contagem por tipo
        const tipos = servicos.reduce((acc, servico) => {
            acc[servico.tipo] = (acc[servico.tipo] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return { totalServicos, ativos, inativos, precoMedio, tipos };
    }, [servicos]);

    // Handlers
    const handleOpenModal = (servico: Servico | null = null) => {
        if (servico) {
            setServicoToEdit(servico);
            setFormState({
                nome: servico.nome,
                codigo: servico.codigo,
                descricao: servico.descricao,
                tipo: servico.tipo,
                preco: servico.preco,
                unidade: servico.unidade,
                tempoEstimado: servico.tempoEstimado,
                categoria: servico.categoria,
                observacoes: servico.observacoes || ''
            });
        } else {
            setServicoToEdit(null);
            setFormState({
                nome: '',
                codigo: '',
                descricao: '',
                tipo: '',
                preco: 0,
                unidade: 'hora',
                tempoEstimado: 1,
                categoria: '',
                observacoes: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setServicoToEdit(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            // Simulação de API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            alert('✅ Serviço salvo com sucesso!');
            handleCloseModal();
            await loadServicos();
        } catch (error) {
            alert('❌ Erro ao salvar serviço');
        }
    };

    const handleDelete = async () => {
        if (!servicoToDelete) return;
        
        try {
            // Simulação de API call
            await new Promise(resolve => setTimeout(resolve, 500));
            
            alert('✅ Serviço removido com sucesso!');
            setServicoToDelete(null);
            await loadServicos();
        } catch (error) {
            alert('❌ Erro ao remover serviço');
        }
    };

    const handleReativar = async (servico: Servico) => {
        if (window.confirm(`Deseja reativar o serviço "${servico.nome}"?`)) {
            try {
                // Simulação de API call
                await new Promise(resolve => setTimeout(resolve, 500));
                
                alert('✅ Serviço reativado com sucesso!');
                await loadServicos();
            } catch (error) {
                alert('❌ Erro ao reativar serviço');
            }
        }
    };

    const getTypeIcon = (tipo: string) => {
        switch (tipo.toLowerCase()) {
            case 'instalação':
                return '🔧';
            case 'manutenção':
                return '⚙️';
            case 'projeto':
                return '📐';
            case 'consultoria':
                return '💡';
            default:
                return '🛠️';
        }
    };

    const getTypeColor = (tipo: string) => {
        switch (tipo.toLowerCase()) {
            case 'instalação':
                return 'bg-blue-100 text-blue-800 ring-1 ring-blue-200';
            case 'manutenção':
                return 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200';
            case 'projeto':
                return 'bg-purple-100 text-purple-800 ring-1 ring-purple-200';
            case 'consultoria':
                return 'bg-green-100 text-green-800 ring-1 ring-green-200';
            default:
                return 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-600 dark:border-cyan-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando serviços...</p>
                </div>
            </div>
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
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Serviços</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Gerencie serviços e especialidades técnicas</p>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-600 transition-all shadow-medium font-semibold"
                >
                    <PlusIcon className="w-5 h-5" />
                    Novo Serviço
                </button>
            </header>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 animate-fade-in">
                    <p className="text-red-800 font-medium">⚠️ {error}</p>
                </div>
            )}

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center">
                            <WrenchScrewdriverIcon className="w-6 h-6 text-cyan-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total de Serviços</p>
                            <p className="text-2xl font-bold text-cyan-600">{stats.totalServicos}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                            <span className="text-2xl">✅</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Serviços Ativos</p>
                            <p className="text-2xl font-bold text-green-600">{stats.ativos}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
                            <span className="text-2xl">❌</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Serviços Inativos</p>
                            <p className="text-2xl font-bold text-red-600">{stats.inativos}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                            <span className="text-2xl">💰</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Preço Médio</p>
                            <p className="text-2xl font-bold text-purple-600">
                                R$ {stats.precoMedio.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros e Toggle de Visualização */}
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${
                                viewMode === 'grid'
                                    ? 'bg-white text-cyan-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                            title="Visualização em Cards"
                        >
                            <Squares2X2Icon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${
                                viewMode === 'list'
                                    ? 'bg-white text-cyan-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                            title="Visualização em Lista"
                        >
                            <ListBulletIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, descrição ou categoria..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                            />
                        </div>
                    </div>

                    <div>
                        <select
                            value={tipoFilter}
                            onChange={(e) => setTipoFilter(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="Todos">Todos os Tipos</option>
                            <option value="Instalação">Instalação</option>
                            <option value="Manutenção">Manutenção</option>
                            <option value="Projeto">Projeto</option>
                            <option value="Consultoria">Consultoria</option>
                        </select>
                    </div>

                    <div>
                        <select
                            value={ativoFilter}
                            onChange={(e) => setAtivoFilter(e.target.value as 'Todos' | 'true' | 'false')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="Todos">Todos os Status</option>
                            <option value="true">Ativos</option>
                            <option value="false">Inativos</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Exibindo <span className="font-bold text-gray-900">{filteredServicos.length}</span> de <span className="font-bold text-gray-900">{servicos.length}</span> serviços
                    </p>
                </div>
            </div>

            {/* Lista/Grid de Serviços */}
            {filteredServicos.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">🛠️</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhum serviço encontrado</h3>
                    <p className="text-gray-500 mb-6">
                        {searchTerm || tipoFilter !== 'Todos' || ativoFilter !== 'Todos'
                            ? 'Tente ajustar os filtros de busca'
                            : 'Comece cadastrando seus primeiros serviços'}
                    </p>
                    {!searchTerm && tipoFilter === 'Todos' && ativoFilter === 'Todos' && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white px-6 py-3 rounded-xl hover:from-cyan-700 hover:to-cyan-600 transition-all shadow-medium font-semibold"
                        >
                            <PlusIcon className="w-5 h-5 inline mr-2" />
                            Cadastrar Primeiro Serviço
                        </button>
                    )}
                </div>
            ) : viewMode === 'list' ? (
                <div className="space-y-4">
                    {filteredServicos.map((servico) => (
                        <div key={servico.id} className={`bg-white border-2 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-200 ${
                            servico.ativo ? 'border-gray-200 hover:border-cyan-300' : 'border-red-200 hover:border-red-300 opacity-75'
                        }`}>
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Informações Principais */}
                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-bold text-xl text-gray-900 mb-2">{servico.nome}</h3>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-3 py-1 text-xs font-bold rounded-lg ${getTypeColor(servico.tipo)}`}>
                                                    {getTypeIcon(servico.tipo)} {servico.tipo}
                                                </span>
                                                <span className="px-3 py-1 text-xs font-bold rounded-lg bg-gray-100 text-gray-700">
                                                    📂 {servico.categoria}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${
                                            servico.ativo 
                                                ? 'bg-green-100 text-green-800 ring-1 ring-green-200' 
                                                : 'bg-red-100 text-red-800 ring-1 ring-red-200'
                                        }`}>
                                            {servico.ativo ? '✅ Ativo' : '❌ Inativo'}
                                        </span>
                                    </div>
                                    
                                    <p className="text-gray-600 mb-3">{servico.descricao}</p>
                                    
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <span className="flex items-center gap-1">
                                            <span>⏱️</span>
                                            <span>{servico.tempoEstimado}h estimadas</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span>📏</span>
                                            <span>Unidade: {servico.unidade}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Preço e Ações */}
                                <div className="flex flex-col justify-between min-w-[200px]">
                                    <div className="bg-cyan-50 border border-cyan-200 p-4 rounded-xl mb-4">
                                        <p className="text-xs font-medium text-cyan-600 mb-1">Preço do Serviço</p>
                                        <p className="text-2xl font-bold text-cyan-700">
                                            R$ {servico.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs text-cyan-600 mt-1">por {servico.unidade}</p>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {servico.ativo ? (
                                            <>
                                                <button
                                                    onClick={() => setServicoToView(servico)}
                                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                    Visualizar
                                                </button>
                                                <button
                                                    onClick={() => handleOpenModal(servico)}
                                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition-colors text-sm font-semibold"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => setServicoToDelete(servico)}
                                                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                    Desativar
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleReativar(servico)}
                                                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-semibold"
                                            >
                                                <ArrowPathIcon className="w-4 h-4" />
                                                Reativar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredServicos.map((servico) => (
                        <div key={servico.id} className={`bg-white border-2 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-200 ${
                            servico.ativo ? 'border-gray-200 hover:border-cyan-300' : 'border-red-200 hover:border-red-300 opacity-75'
                        }`}>
                            {/* Header do Card */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-2">{servico.nome}</h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${getTypeColor(servico.tipo)}`}>
                                            {getTypeIcon(servico.tipo)} {servico.tipo}
                                        </span>
                                    </div>
                                </div>
                                <span className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${
                                    servico.ativo 
                                        ? 'bg-green-100 text-green-800 ring-1 ring-green-200' 
                                        : 'bg-red-100 text-red-800 ring-1 ring-red-200'
                                }`}>
                                    {servico.ativo ? '✅ Ativo' : '❌ Inativo'}
                                </span>
                            </div>

                            {/* Informações */}
                            <div className="space-y-2 mb-4">
                                <div className="text-sm text-gray-600">
                                    <p className="line-clamp-2">{servico.descricao}</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>📂</span>
                                    <span className="truncate">{servico.categoria}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>⏱️</span>
                                    <span>{servico.tempoEstimado}h estimadas</span>
                                </div>
                            </div>

                            {/* Preço */}
                            <div className="bg-cyan-50 border border-cyan-200 p-3 rounded-xl mb-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-cyan-800">Preço:</span>
                                    <div className="text-right">
                                        <span className="text-xl font-bold text-cyan-700">
                                            R$ {servico.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                        <p className="text-xs text-cyan-600">/{servico.unidade}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                {servico.ativo ? (
                                    <>
                                        <button
                                            onClick={() => setServicoToView(servico)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                            Ver
                                        </button>
                                        <button
                                            onClick={() => handleOpenModal(servico)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition-colors text-sm font-semibold"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => setServicoToDelete(servico)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                            Desativar
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleReativar(servico)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                                    >
                                        <ArrowPathIcon className="w-5 h-5" />
                                        Reativar Serviço
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-strong max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
                        {/* Header */}
                        <div className="relative p-6 border-b border-gray-100 bg-gradient-to-r from-cyan-50 to-blue-50">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center shadow-medium ring-2 ring-cyan-100">
                                    {servicoToEdit ? <PencilIcon className="w-7 h-7 text-white" /> : <PlusIcon className="w-7 h-7 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {servicoToEdit ? 'Editar Serviço' : 'Novo Serviço'}
                                    </h2>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {servicoToEdit ? 'Atualize as informações do serviço' : 'Cadastre um novo serviço técnico'}
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
                            {/* Informações Básicas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Nome do Serviço *
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.nome}
                                        onChange={(e) => setFormState({...formState, nome: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
                                        placeholder="Ex: Instalação Elétrica Residencial"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Tipo *
                                    </label>
                                    <select
                                        value={formState.tipo}
                                        onChange={(e) => setFormState({...formState, tipo: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
                                    >
                                        <option value="">Selecione o tipo</option>
                                        <option value="Instalação">Instalação</option>
                                        <option value="Manutenção">Manutenção</option>
                                        <option value="Projeto">Projeto</option>
                                        <option value="Consultoria">Consultoria</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Categoria *
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.categoria}
                                        onChange={(e) => setFormState({...formState, categoria: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
                                        placeholder="Ex: Elétrica, Automação"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Descrição *
                                    </label>
                                    <textarea
                                        value={formState.descricao}
                                        onChange={(e) => setFormState({...formState, descricao: e.target.value})}
                                        required
                                        rows={3}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
                                        placeholder="Descreva detalhadamente o serviço oferecido..."
                                    />
                                </div>
                            </div>

                            {/* Preço e Tempo */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Preço (R$) *
                                    </label>
                                    <input
                                        type="number"
                                        value={formState.preco}
                                        onChange={(e) => setFormState({...formState, preco: Number(e.target.value)})}
                                        required
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
                                        placeholder="0,00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Unidade de Medida *
                                    </label>
                                    <select
                                        value={formState.unidade}
                                        onChange={(e) => setFormState({...formState, unidade: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
                                    >
                                        <option value="hora">Hora</option>
                                        <option value="projeto">Projeto</option>
                                        <option value="visita">Visita</option>
                                        <option value="ponto">Ponto</option>
                                        <option value="m²">Metro quadrado</option>
                                        <option value="unidade">Unidade</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Tempo Estimado (horas) *
                                    </label>
                                    <input
                                        type="number"
                                        value={formState.tempoEstimado}
                                        onChange={(e) => setFormState({...formState, tempoEstimado: Number(e.target.value)})}
                                        required
                                        min="0.5"
                                        step="0.5"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
                                        placeholder="1"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Observações
                                </label>
                                <textarea
                                    value={formState.observacoes}
                                    onChange={(e) => setFormState({...formState, observacoes: e.target.value})}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
                                    placeholder="Informações adicionais sobre o serviço..."
                                />
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
                                    className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-600 transition-all shadow-medium font-semibold"
                                >
                                    {servicoToEdit ? 'Atualizar' : 'Cadastrar'} Serviço
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE VISUALIZAÇÃO */}
            {servicoToView && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-strong max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-cyan-50">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Detalhes do Serviço</h2>
                                <p className="text-sm text-gray-600 mt-1">Informações completas do serviço</p>
                            </div>
                            <button onClick={() => setServicoToView(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-xl">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 mb-2">Nome</h3>
                                    <p className="text-gray-900 font-medium">{servicoToView.nome}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 mb-2">Tipo</h3>
                                    <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${getTypeColor(servicoToView.tipo)}`}>
                                        {getTypeIcon(servicoToView.tipo)} {servicoToView.tipo}
                                    </span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 mb-2">Categoria</h3>
                                    <p className="text-gray-900 font-medium">{servicoToView.categoria}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 mb-2">Status</h3>
                                    <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                                        servicoToView.ativo 
                                            ? 'bg-green-100 text-green-800 ring-1 ring-green-200' 
                                            : 'bg-red-100 text-red-800 ring-1 ring-red-200'
                                    }`}>
                                        {servicoToView.ativo ? '✅ Ativo' : '❌ Inativo'}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-cyan-50 border border-cyan-200 p-4 rounded-xl">
                                <h3 className="font-semibold text-gray-800 mb-2">Descrição</h3>
                                <p className="text-gray-700">{servicoToView.descricao}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 mb-2">Preço</h3>
                                    <p className="text-2xl font-bold text-green-700">
                                        R$ {servicoToView.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-sm text-green-600">/{servicoToView.unidade}</p>
                                </div>
                                {servicoToView.tempoEstimado && (
                                    <>
                                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                                            <h3 className="font-semibold text-gray-800 mb-2">Tempo Estimado</h3>
                                            <p className="text-2xl font-bold text-blue-700">{servicoToView.tempoEstimado}h</p>
                                        </div>
                                        <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
                                            <h3 className="font-semibold text-gray-800 mb-2">Valor/Hora</h3>
                                            <p className="text-2xl font-bold text-purple-700">
                                                R$ {(servicoToView.preco / servicoToView.tempoEstimado).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {servicoToView.observacoes && (
                                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 mb-2">Observações</h3>
                                    <p className="text-gray-700">{servicoToView.observacoes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
            {servicoToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-strong max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Desativar Serviço</h3>
                        <p className="text-gray-600 mb-6">
                            Tem certeza que deseja desativar o serviço <strong>"{servicoToDelete.nome}"</strong>? 
                            O serviço ficará inativo mas poderá ser reativado futuramente.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setServicoToDelete(null)}
                                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold"
                            >
                                Desativar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServicosAPI;