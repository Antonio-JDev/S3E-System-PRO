import React, { useState, useMemo, useEffect, useContext } from 'react';
import { toast } from 'sonner';
import { fornecedoresService, type Fornecedor, type CreateFornecedorData } from '../services/fornecedoresService';
import ViewToggle from './ui/ViewToggle';
import { loadViewMode, saveViewMode } from '../utils/viewModeStorage';
import { AuthContext } from '../contexts/AuthContext';
import { canDelete } from '../utils/permissions';
import AlertDialog from './ui/AlertDialog';

// Icons (mesmos do ClientesModerno)
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.038-2.124H9.038c-1.128 0-2.038.944-2.038 2.124v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const ArrowPathIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
);

interface FornecedoresProps {
    toggleSidebar: () => void;
}

const FornecedoresModerno: React.FC<FornecedoresProps> = ({ toggleSidebar }) => {
    const { user } = useContext(AuthContext)!;
    
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [ativoFilter, setAtivoFilter] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(loadViewMode('Fornecedores'));
    
    // Salvar viewMode no localStorage quando mudar
    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        saveViewMode('Fornecedores', mode);
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fornecedorToEdit, setFornecedorToEdit] = useState<Fornecedor | null>(null);
    const [fornecedorToDelete, setFornecedorToDelete] = useState<Fornecedor | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const [formState, setFormState] = useState<CreateFornecedorData>({
        nome: '',
        cnpj: '',
        email: '',
        telefone: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
        categoria: ''
    });

    useEffect(() => {
        loadFornecedores();
    }, []);

    const loadFornecedores = async () => {
        try {
            setLoading(true);
            const response = await fornecedoresService.listar();
            
            if (response.success && response.data) {
                setFornecedores(response.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredFornecedores = useMemo(() => {
        return fornecedores.filter(fornecedor => {
            const matchesSearch = fornecedor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                fornecedor.cnpj.includes(searchTerm) ||
                                (fornecedor.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            
            const matchesAtivo = ativoFilter === 'Todos' || 
                               (ativoFilter === 'Ativo' ? fornecedor.ativo : !fornecedor.ativo);
            
            return matchesSearch && matchesAtivo;
        });
    }, [fornecedores, searchTerm, ativoFilter]);

    const handleOpenModal = (fornecedor: Fornecedor | null = null) => {
        if (fornecedor) {
            setFornecedorToEdit(fornecedor);
            setFormState({
                nome: fornecedor.nome,
                cnpj: fornecedor.cnpj,
                email: fornecedor.email || '',
                telefone: fornecedor.telefone || '',
                endereco: fornecedor.endereco || '',
                cidade: fornecedor.cidade || '',
                estado: fornecedor.estado || '',
                cep: fornecedor.cep || '',
                categoria: fornecedor.categoria || ''
            });
        } else {
            setFornecedorToEdit(null);
            setFormState({
                nome: '',
                cnpj: '',
                email: '',
                telefone: '',
                endereco: '',
                cidade: '',
                estado: '',
                cep: '',
                categoria: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            if (fornecedorToEdit) {
                const response = await fornecedoresService.atualizar(fornecedorToEdit.id, formState);
                if (response.success) {
                    await loadFornecedores();
                    setIsModalOpen(false);
                }
            } else {
                const response = await fornecedoresService.criar(formState);
                if (response.success) {
                    await loadFornecedores();
                    setIsModalOpen(false);
                }
            }
        } catch (err) {
            toast.error('Erro ao salvar fornecedor', {
                description: 'Verifique os dados e tente novamente'
            });
        }
    };

    const handleDelete = async () => {
        if (!fornecedorToDelete) return;
        
        try {
            const response = await fornecedoresService.desativar(fornecedorToDelete.id);
            if (response.success) {
                toast.success('Fornecedor excluído', {
                    description: `Fornecedor "${fornecedorToDelete.nome}" foi desativado com sucesso`
                });
                await loadFornecedores();
            } else {
                toast.error('Erro ao excluir', {
                    description: response.error || 'Erro ao excluir fornecedor'
                });
            }
        } catch (err) {
            toast.error('Erro ao excluir fornecedor', {
                description: 'Verifique sua conexão'
            });
        }
        
        setShowDeleteDialog(false);
        setFornecedorToDelete(null);
    };

    const handleReativar = async (fornecedor: Fornecedor) => {
        toast(`Reativar fornecedor "${fornecedor.nome}"?`, {
            action: {
                label: 'Reativar',
                onClick: async () => {
                    const promise = (async () => {
                        const response = await fornecedoresService.reativar(fornecedor.id);
                        if (response.success) {
                            await loadFornecedores();
                            return fornecedor.nome;
                        }
                        throw new Error('Erro ao reativar fornecedor');
                    })();

                    toast.promise(promise, {
                        loading: 'Reativando fornecedor...',
                        success: (nome) => `${nome} reativado!`,
                        error: 'Erro ao reativar fornecedor'
                    });
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando fornecedores...</p>
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
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">Fornecedores</h1>
                        <p className="text-sm sm:text-base text-gray-500 mt-1">Gerencie seus fornecedores e parceiros comerciais</p>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-medium font-semibold"
                >
                    <PlusIcon className="w-5 h-5" />
                    Novo Fornecedor
                </button>
            </header>

            {/* Filtros */}
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, CNPJ ou email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>
                    </div>

                    <div>
                        <select
                            value={ativoFilter}
                            onChange={(e) => setAtivoFilter(e.target.value as any)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="Todos">Todos os Status</option>
                            <option value="Ativo">Ativos</option>
                            <option value="Inativo">Inativos</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm text-gray-600">
                        Exibindo <span className="font-bold text-gray-900">{filteredFornecedores.length}</span> de <span className="font-bold text-gray-900">{fornecedores.length}</span> fornecedores
                    </p>
                    <div className="flex items-center gap-4">
                        <ViewToggle view={viewMode} onViewChange={handleViewModeChange} />
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Ativo: {fornecedores.filter(f => f.ativo).length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Inativo: {fornecedores.filter(f => !f.ativo).length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid/Lista de Fornecedores */}
            {filteredFornecedores.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">🏭</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhum fornecedor encontrado</h3>
                    <p className="text-gray-500 mb-6">
                        {searchTerm || ativoFilter !== 'Todos'
                            ? 'Tente ajustar os filtros de busca'
                            : 'Comece adicionando seu primeiro fornecedor'}
                    </p>
                    {!searchTerm && ativoFilter === 'Todos' && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-6 py-3 rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-medium font-semibold"
                        >
                            <PlusIcon className="w-5 h-5 inline mr-2" />
                            Adicionar Primeiro Fornecedor
                        </button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFornecedores.map((fornecedor) => (
                        <div key={fornecedor.id} className={`bg-white border-2 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-200 ${
                            fornecedor.ativo ? 'border-gray-200 hover:border-orange-300' : 'border-red-200 hover:border-red-300 opacity-75'
                        }`}>
                            {/* Header do Card */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-900 mb-1">{fornecedor.nome}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 text-xs font-bold rounded-lg bg-orange-100 text-orange-800 ring-1 ring-orange-200">
                                            🏭 Fornecedor
                                        </span>
                                    </div>
                                </div>
                                <span className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${
                                    fornecedor.ativo 
                                        ? 'bg-green-100 text-green-800 ring-1 ring-green-200' 
                                        : 'bg-red-100 text-red-800 ring-1 ring-red-200'
                                }`}>
                                    {fornecedor.ativo ? '✓ Ativo' : '⚠ Inativo'}
                                </span>
                            </div>

                            {/* Informações */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{fornecedor.cnpj}</span>
                                </div>
                                {fornecedor.email && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <span>📧</span>
                                        <span className="truncate">{fornecedor.email}</span>
                                    </div>
                                )}
                                {fornecedor.telefone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <span>📱</span>
                                        <span>{fornecedor.telefone}</span>
                                    </div>
                                )}
                                {fornecedor.endereco && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <span>📍</span>
                                        <span className="truncate">{fornecedor.endereco}</span>
                                    </div>
                                )}
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                {fornecedor.ativo ? (
                                    <>
                                        <button
                                            onClick={() => handleOpenModal(fornecedor)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                            Editar
                                        </button>
                                        {canDelete(user) && (
                                            <button
                                                onClick={() => {
                                                    setFornecedorToDelete(fornecedor);
                                                    setShowDeleteDialog(true);
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
                                                title="Excluir fornecedor (apenas Desenvolvedor/Administrador)"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                                Excluir
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleReativar(fornecedor)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                                    >
                                        <ArrowPathIcon className="w-5 h-5" />
                                        Reativar Fornecedor
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
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Nome</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">CNPJ</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Telefone</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredFornecedores.map((fornecedor) => (
                                    <tr key={fornecedor.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-bold text-gray-900">{fornecedor.nome}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="font-mono text-sm text-gray-600">{fornecedor.cnpj}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-600">{fornecedor.email || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-600">{fornecedor.telefone || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${
                                                fornecedor.ativo 
                                                    ? 'bg-green-100 text-green-800 ring-1 ring-green-200' 
                                                    : 'bg-red-100 text-red-800 ring-1 ring-red-200'
                                            }`}>
                                                {fornecedor.ativo ? '✓ Ativo' : '⚠ Inativo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {fornecedor.ativo ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenModal(fornecedor)}
                                                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        {canDelete(user) && (
                                                            <button
                                                                onClick={() => {
                                                                    setFornecedorToDelete(fornecedor);
                                                                    setShowDeleteDialog(true);
                                                                }}
                                                                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
                                                                title="Excluir fornecedor (apenas Desenvolvedor/Administrador)"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => handleReativar(fornecedor)}
                                                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                                                    >
                                                        <ArrowPathIcon className="w-5 h-5" />
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
                    <div className="bg-white rounded-2xl shadow-strong max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
                        <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-orange-600 to-orange-700">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-medium">
                                    {fornecedorToEdit ? <PencilIcon className="w-7 h-7 text-white" /> : <PlusIcon className="w-7 h-7 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-white">
                                        {fornecedorToEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                                    </h2>
                                    <p className="text-sm text-white/80 mt-1">
                                        {fornecedorToEdit ? 'Atualize as informações do fornecedor' : 'Cadastre um novo parceiro comercial'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-xl"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Razão Social *
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.nome}
                                        onChange={(e) => setFormState({...formState, nome: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                        placeholder="Nome da empresa"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        CNPJ *
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.cnpj}
                                        onChange={(e) => setFormState({...formState, cnpj: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                        placeholder="00.000.000/0000-00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formState.email}
                                        onChange={(e) => setFormState({...formState, email: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                        placeholder="contato@fornecedor.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Telefone
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.telefone}
                                        onChange={(e) => setFormState({...formState, telefone: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                        placeholder="(00) 0000-0000"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Endereço
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.endereco}
                                        onChange={(e) => setFormState({...formState, endereco: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                        placeholder="Rua, número, complemento"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Cidade
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.cidade}
                                        onChange={(e) => setFormState({...formState, cidade: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                        placeholder="Nome da cidade"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Estado
                                    </label>
                                    <select
                                        value={formState.estado}
                                        onChange={(e) => setFormState({...formState, estado: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                    >
                                        <option value="">Selecione o estado</option>
                                        <option value="AC">Acre</option>
                                        <option value="AL">Alagoas</option>
                                        <option value="AP">Amapá</option>
                                        <option value="AM">Amazonas</option>
                                        <option value="BA">Bahia</option>
                                        <option value="CE">Ceará</option>
                                        <option value="DF">Distrito Federal</option>
                                        <option value="ES">Espírito Santo</option>
                                        <option value="GO">Goiás</option>
                                        <option value="MA">Maranhão</option>
                                        <option value="MT">Mato Grosso</option>
                                        <option value="MS">Mato Grosso do Sul</option>
                                        <option value="MG">Minas Gerais</option>
                                        <option value="PA">Pará</option>
                                        <option value="PB">Paraíba</option>
                                        <option value="PR">Paraná</option>
                                        <option value="PE">Pernambuco</option>
                                        <option value="PI">Piauí</option>
                                        <option value="RJ">Rio de Janeiro</option>
                                        <option value="RN">Rio Grande do Norte</option>
                                        <option value="RS">Rio Grande do Sul</option>
                                        <option value="RO">Rondônia</option>
                                        <option value="RR">Roraima</option>
                                        <option value="SC">Santa Catarina</option>
                                        <option value="SP">São Paulo</option>
                                        <option value="SE">Sergipe</option>
                                        <option value="TO">Tocantins</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        CEP
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.cep}
                                        onChange={(e) => setFormState({...formState, cep: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                        placeholder="00000-000"
                                        maxLength={9}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Categoria
                                    </label>
                                    <select
                                        value={formState.categoria}
                                        onChange={(e) => setFormState({...formState, categoria: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                    >
                                        <option value="">Selecione a categoria</option>
                                        <option value="Materiais Elétricos">Materiais Elétricos</option>
                                        <option value="Ferramentas">Ferramentas</option>
                                        <option value="Equipamentos">Equipamentos</option>
                                        <option value="Iluminação">Iluminação</option>
                                        <option value="Automação">Automação</option>
                                        <option value="Cabos e Fios">Cabos e Fios</option>
                                        <option value="Quadros e Painéis">Quadros e Painéis</option>
                                        <option value="Proteção">Proteção</option>
                                        <option value="Diversos">Diversos</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-medium font-semibold"
                                >
                                    {fornecedorToEdit ? 'Atualizar' : 'Cadastrar'} Fornecedor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AlertDialog de Confirmação de Exclusão */}
            <AlertDialog
                isOpen={showDeleteDialog}
                onClose={() => {
                    setShowDeleteDialog(false);
                    setFornecedorToDelete(null);
                }}
                onConfirm={handleDelete}
                title={`Excluir fornecedor "${fornecedorToDelete?.nome || 'N/A'}"?`}
                message={`Tem certeza que deseja desativar este fornecedor? O fornecedor ficará inativo mas poderá ser reativado futuramente.`}
                confirmText="Excluir"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
};

export default FornecedoresModerno;

