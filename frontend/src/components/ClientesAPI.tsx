import React, { useState, useMemo, useRef, useEffect } from 'react';
import { clientesService, type Cliente, type CreateClienteData, type UpdateClienteData } from '../services/clientesService';
import LoadingSpinner from './LoadingSpinner';
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 4.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.038-2.124H9.038c-1.128 0-2.038.944-2.038 2.124v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

interface ClientesProps {
    toggleSidebar: () => void;
}

const ClientesAPI: React.FC<ClientesProps> = ({ toggleSidebar }) => {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFilter, setTipoFilter] = useState<'Todos' | 'PF' | 'PJ'>('Todos');
    const [ativoFilter, setAtivoFilter] = useState<'Todos' | 'true' | 'false'>('Todos');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clienteToEdit, setClienteToEdit] = useState<Cliente | null>(null);
    const [clienteToView, setClienteToView] = useState<Cliente | null>(null);
    const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);

    const [formState, setFormState] = useState<CreateClienteData>({
        nome: '',
        cpfCnpj: '',
        email: '',
        telefone: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
        tipo: 'PJ'
    });

    // Carregar clientes
    useEffect(() => {
        loadClientes();
    }, []);

    const loadClientes = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await clientesService.listar();
            
            if (response.success && response.data) {
                setClientes(response.data);
            } else {
                setError(response.message || 'Erro ao carregar clientes');
            }
        } catch (err) {
            setError('Erro ao carregar clientes');
            console.error('Erro ao carregar clientes:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredClientes = useMemo(() => {
        return clientes.filter(cliente => {
            const matchesSearch = cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                cliente.cpfCnpj.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                cliente.email.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesTipo = tipoFilter === 'Todos' || cliente.tipo === tipoFilter;
            const matchesAtivo = ativoFilter === 'Todos' || cliente.ativo.toString() === ativoFilter;
            
            return matchesSearch && matchesTipo && matchesAtivo;
        });
    }, [clientes, searchTerm, tipoFilter, ativoFilter]);

    const resetForm = () => {
        setFormState({
            nome: '',
            cpfCnpj: '',
            email: '',
            telefone: '',
            endereco: '',
            cidade: '',
            estado: '',
            cep: '',
            tipo: 'PJ'
        });
    };

    const handleOpenModal = (cliente: Cliente | null = null) => {
        if (cliente) {
            setClienteToEdit(cliente);
            setFormState({
                nome: cliente.nome,
                cpfCnpj: cliente.cpfCnpj,
                email: cliente.email,
                telefone: cliente.telefone,
                endereco: cliente.endereco,
                cidade: cliente.cidade,
                estado: cliente.estado,
                cep: cliente.cep,
                tipo: cliente.tipo
            });
        } else {
            setClienteToEdit(null);
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setClienteToEdit(null);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            if (clienteToEdit) {
                // Atualizar cliente
                const response = await clientesService.atualizar(clienteToEdit.id, formState);
                if (response.success && response.data) {
                    setClientes(prev => prev.map(c => c.id === clienteToEdit.id ? response.data! : c));
                    handleCloseModal();
                } else {
                    alert(response.message || 'Erro ao atualizar cliente');
                }
            } else {
                // Criar novo cliente
                const response = await clientesService.criar(formState);
                if (response.success && response.data) {
                    setClientes(prev => [response.data!, ...prev]);
                    handleCloseModal();
                } else {
                    alert(response.message || 'Erro ao criar cliente');
                }
            }
        } catch (err) {
            alert('Erro ao salvar cliente');
            console.error('Erro ao salvar cliente:', err);
        }
    };

    const handleDelete = async () => {
        if (!clienteToDelete) return;
        
        try {
            const response = await clientesService.desativar(clienteToDelete.id);
            if (response.success) {
                await loadClientes(); // Recarregar para atualizar status
                setClienteToDelete(null);
            } else {
                alert(response.message || 'Erro ao desativar cliente');
            }
        } catch (err) {
            alert('Erro ao desativar cliente');
            console.error('Erro ao desativar cliente:', err);
        }
    };

    const handleReativar = async (cliente: Cliente) => {
        if (window.confirm(`Deseja reativar o cliente "${cliente.nome}"?`)) {
            try {
                const response = await clientesService.reativar(cliente.id);
                if (response.success) {
                    await loadClientes(); // Recarregar para atualizar status
                    alert('✅ Cliente reativado com sucesso!');
                } else {
                    alert(response.message || 'Erro ao reativar cliente');
                }
            } catch (err) {
                alert('Erro ao reativar cliente');
                console.error('Erro ao reativar cliente:', err);
            }
        }
    };

    if (loading) {
        return <LoadingSpinner size="lg" text="Carregando clientes..." />;
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={loadClientes} />;
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
                                className="p-2 rounded-md text-gray-400 dark:text-dark-text-secondary hover:text-gray-500 dark:hover:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-bg lg:hidden"
                            >
                                <Bars3Icon className="h-6 w-6" />
                            </button>
                            <div className="ml-4">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Clientes</h1>
                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Gerencie seus clientes e parceiros</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Novo Cliente
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
                                    placeholder="Nome, CPF/CNPJ, email..."
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                            <select
                                value={tipoFilter}
                                onChange={(e) => setTipoFilter(e.target.value as 'Todos' | 'PF' | 'PJ')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="Todos">Todos</option>
                                <option value="PF">Pessoa Física</option>
                                <option value="PJ">Pessoa Jurídica</option>
                            </select>
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
                                onClick={loadClientes}
                                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                Atualizar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de Clientes */}
            <div className="px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {filteredClientes.map((cliente) => (
                            <li key={cliente.id} className="px-6 py-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {cliente.nome}
                                            </p>
                                            <div className="flex items-center space-x-2">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    cliente.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {cliente.ativo ? 'Ativo' : 'Inativo'}
                                                </span>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    cliente.tipo === 'PF' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                    {cliente.tipo}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-1">
                                            <p className="text-sm text-gray-500">
                                                {cliente.cpfCnpj} • {cliente.email}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {cliente.cidade}, {cliente.estado}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setClienteToView(cliente)}
                                            className="p-2 text-gray-400 hover:text-gray-600"
                                        >
                                            <EyeIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleOpenModal(cliente)}
                                            className="p-2 text-gray-400 hover:text-gray-600"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setClienteToDelete(cliente)}
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

            {/* Modal de Cliente */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    {clienteToEdit ? 'Editar Cliente' : 'Novo Cliente'}
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
                                    <label className="block text-sm font-medium text-gray-700">Tipo</label>
                                    <select
                                        value={formState.tipo}
                                        onChange={(e) => setFormState(prev => ({ ...prev, tipo: e.target.value as 'PF' | 'PJ' }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="PF">Pessoa Física</option>
                                        <option value="PJ">Pessoa Jurídica</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        {formState.tipo === 'PF' ? 'CPF' : 'CNPJ'}
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.cpfCnpj}
                                        onChange={(e) => setFormState(prev => ({ ...prev, cpfCnpj: e.target.value }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email (opcional)</label>
                                    <input
                                        type="email"
                                        value={formState.email}
                                        onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Telefone</label>
                                    <input
                                        type="text"
                                        value={formState.telefone}
                                        onChange={(e) => setFormState(prev => ({ ...prev, telefone: e.target.value }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
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
                                        {clienteToEdit ? 'Atualizar' : 'Criar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {clienteToDelete && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Confirmar Exclusão
                            </h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Tem certeza que deseja desativar o cliente "{clienteToDelete.nome}"?
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setClienteToDelete(null)}
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

export default ClientesAPI;
