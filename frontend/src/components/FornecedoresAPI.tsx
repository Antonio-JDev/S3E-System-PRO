import React, { useState, useMemo, useEffect } from 'react';
import { fornecedoresService, type Fornecedor, type CreateFornecedorData, type UpdateFornecedorData } from '../services/fornecedoresService';
import ErrorMessage from './ErrorMessage';

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
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 4.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.038-2.124H9.038c-1.128 0-2.038.944-2.038 2.124v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

interface FornecedoresProps {
    toggleSidebar: () => void;
}

const FornecedoresAPI: React.FC<FornecedoresProps> = ({ toggleSidebar }) => {
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoriaFilter, setCategoriaFilter] = useState<string>('Todos');
    const [ativoFilter, setAtivoFilter] = useState<'Todos' | 'true' | 'false'>('Todos');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fornecedorToEdit, setFornecedorToEdit] = useState<Fornecedor | null>(null);
    const [fornecedorToDelete, setFornecedorToDelete] = useState<Fornecedor | null>(null);

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

    // Carregar fornecedores
    useEffect(() => {
        loadFornecedores();
    }, []);

    const loadFornecedores = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fornecedoresService.listar();
            
            if (response.success && response.data) {
                setFornecedores(response.data);
            } else {
                setError(response.message || 'Erro ao carregar fornecedores');
            }
        } catch (err) {
            setError('Erro ao carregar fornecedores');
            console.error('Erro ao carregar fornecedores:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredFornecedores = useMemo(() => {
        return fornecedores.filter(fornecedor => {
            const matchesSearch = fornecedor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                fornecedor.cnpj.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                fornecedor.email.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesCategoria = categoriaFilter === 'Todos' || fornecedor.categoria === categoriaFilter;
            const matchesAtivo = ativoFilter === 'Todos' || fornecedor.ativo.toString() === ativoFilter;
            
            return matchesSearch && matchesCategoria && matchesAtivo;
        });
    }, [fornecedores, searchTerm, categoriaFilter, ativoFilter]);

    const resetForm = () => {
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
    };

    const handleOpenModal = (fornecedor: Fornecedor | null = null) => {
        if (fornecedor) {
            setFornecedorToEdit(fornecedor);
            setFormState({
                nome: fornecedor.nome,
                cnpj: fornecedor.cnpj,
                email: fornecedor.email,
                telefone: fornecedor.telefone,
                endereco: fornecedor.endereco,
                cidade: fornecedor.cidade,
                estado: fornecedor.estado,
                cep: fornecedor.cep,
                categoria: fornecedor.categoria
            });
        } else {
            setFornecedorToEdit(null);
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFornecedorToEdit(null);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            if (fornecedorToEdit) {
                // Atualizar fornecedor
                const response = await fornecedoresService.atualizar(fornecedorToEdit.id, formState);
                if (response.success && response.data) {
                    setFornecedores(prev => prev.map(f => f.id === fornecedorToEdit.id ? response.data! : f));
                    handleCloseModal();
                } else {
                    alert(response.message || 'Erro ao atualizar fornecedor');
                }
            } else {
                // Criar novo fornecedor
                const response = await fornecedoresService.criar(formState);
                if (response.success && response.data) {
                    setFornecedores(prev => [response.data!, ...prev]);
                    handleCloseModal();
                } else {
                    alert(response.message || 'Erro ao criar fornecedor');
                }
            }
        } catch (err) {
            alert('Erro ao salvar fornecedor');
            console.error('Erro ao salvar fornecedor:', err);
        }
    };

    const handleDelete = async () => {
        if (!fornecedorToDelete) return;
        
        try {
            const response = await fornecedoresService.desativar(fornecedorToDelete.id);
            if (response.success) {
                setFornecedores(prev => prev.filter(f => f.id !== fornecedorToDelete.id));
                setFornecedorToDelete(null);
            } else {
                alert(response.message || 'Erro ao desativar fornecedor');
            }
        } catch (err) {
            alert('Erro ao desativar fornecedor');
            console.error('Erro ao desativar fornecedor:', err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 dark:border-orange-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando fornecedores...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={loadFornecedores} />;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
            {/* Header */}
            <div className="bg-white dark:bg-dark-card shadow border-b border-gray-200 dark:border-dark-border">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <button
                                onClick={toggleSidebar}
                                className="p-2 rounded-md text-gray-400 dark:text-dark-text-secondary hover:text-gray-500 dark:hover:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-hover lg:hidden"
                            >
                                <Bars3Icon className="h-6 w-6" />
                            </button>
                            <div className="ml-4">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Fornecedores</h1>
                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Gerencie seus fornecedores</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Novo Fornecedor
                        </button>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white border-b border-gray-200">
                <div className="px-4 sm:px-6 lg:px-8 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                                    placeholder="Nome, CNPJ, email..."
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                            <input
                                type="text"
                                value={categoriaFilter}
                                onChange={(e) => setCategoriaFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Filtrar por categoria"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={ativoFilter}
                                onChange={(e) => setAtivoFilter(e.target.value as 'Todos' | 'true' | 'false')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="Todos">Todos</option>
                                <option value="true">Ativo</option>
                                <option value="false">Inativo</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={loadFornecedores}
                                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                Atualizar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de Fornecedores */}
            <div className="px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {filteredFornecedores.map((fornecedor) => (
                            <li key={fornecedor.id} className="px-6 py-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {fornecedor.nome}
                                            </p>
                                            <div className="flex items-center space-x-2">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    fornecedor.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                                                </span>
                                                {fornecedor.categoria && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {fornecedor.categoria}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-1">
                                            <p className="text-sm text-gray-500">
                                                CNPJ: {fornecedor.cnpj} • {fornecedor.email}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {fornecedor.cidade}, {fornecedor.estado}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleOpenModal(fornecedor)}
                                            className="p-2 text-gray-400 hover:text-gray-600"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setFornecedorToDelete(fornecedor)}
                                            className="p-2 text-gray-400 hover:text-red-600"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Modal de Fornecedor */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    {fornecedorToEdit ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                                </h3>
                                <button
                                    onClick={handleCloseModal}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nome</label>
                                    <input
                                        type="text"
                                        value={formState.nome}
                                        onChange={(e) => setFormState(prev => ({ ...prev, nome: e.target.value }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">CNPJ</label>
                                    <input
                                        type="text"
                                        value={formState.cnpj}
                                        onChange={(e) => setFormState(prev => ({ ...prev, cnpj: e.target.value }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        value={formState.email}
                                        onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Telefone</label>
                                    <input
                                        type="text"
                                        value={formState.telefone}
                                        onChange={(e) => setFormState(prev => ({ ...prev, telefone: e.target.value }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Endereço</label>
                                    <input
                                        type="text"
                                        value={formState.endereco}
                                        onChange={(e) => setFormState(prev => ({ ...prev, endereco: e.target.value }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Cidade</label>
                                        <input
                                            type="text"
                                            value={formState.cidade}
                                            onChange={(e) => setFormState(prev => ({ ...prev, cidade: e.target.value }))}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Estado</label>
                                        <input
                                            type="text"
                                            value={formState.estado}
                                            onChange={(e) => setFormState(prev => ({ ...prev, estado: e.target.value }))}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">CEP</label>
                                    <input
                                        type="text"
                                        value={formState.cep}
                                        onChange={(e) => setFormState(prev => ({ ...prev, cep: e.target.value }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Categoria</label>
                                    <input
                                        type="text"
                                        value={formState.categoria}
                                        onChange={(e) => setFormState(prev => ({ ...prev, categoria: e.target.value }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ex: Materiais Elétricos, Equipamentos, etc."
                                    />
                                </div>
                                
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                    >
                                        {fornecedorToEdit ? 'Atualizar' : 'Criar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {fornecedorToDelete && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Confirmar Exclusão
                            </h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Tem certeza que deseja desativar o fornecedor "{fornecedorToDelete.nome}"?
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setFornecedorToDelete(null)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                                >
                                    Desativar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FornecedoresAPI;
