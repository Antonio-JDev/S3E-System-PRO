import React, { useState, useMemo, useEffect } from 'react';
import { projetosService, type Projeto, type CreateProjetoData, type UpdateProjetoData } from '../services/projetosService';
import { clientesService, type Cliente } from '../services/clientesService';
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

interface ProjetosProps {
    toggleSidebar: () => void;
    onNavigate: (view: string) => void;
    onViewBudget: (budgetId: string) => void;
    initialProjectId: string | null;
    clearInitialProjectId: () => void;
    projects: any[];
    setProjects: (projects: any[]) => void;
}

const ProjetosAPI: React.FC<ProjetosProps> = ({ 
    toggleSidebar, 
    onNavigate, 
    onViewBudget, 
    initialProjectId, 
    clearInitialProjectId, 
    projects, 
    setProjects 
}) => {
    const [projetos, setProjetos] = useState<Projeto[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('Todos');
    const [tipoFilter, setTipoFilter] = useState<string>('Todos');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projetoToEdit, setProjetoToEdit] = useState<Projeto | null>(null);
    const [projetoToDelete, setProjetoToDelete] = useState<Projeto | null>(null);

    const [formState, setFormState] = useState<CreateProjetoData>({
        titulo: '',
        descricao: '',
        tipo: 'Instalacao',
        clienteId: '',
        responsavelId: '',
        dataInicio: '',
        dataPrevisao: '',
        orcamentoId: ''
    });

    // Carregar dados
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [projetosResponse, clientesResponse] = await Promise.all([
                projetosService.listar(),
                clientesService.listar()
            ]);

            if (projetosResponse.success && projetosResponse.data) {
                setProjetos(projetosResponse.data);
            } else {
                setError(projetosResponse.message || 'Erro ao carregar projetos');
            }

            if (clientesResponse.success && clientesResponse.data) {
                setClientes(clientesResponse.data);
            }
        } catch (err) {
            setError('Erro ao carregar dados');
            console.error('Erro ao carregar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredProjetos = useMemo(() => {
        return projetos.filter(projeto => {
            const matchesSearch = projeto.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                projeto.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                projeto.cliente?.nome.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'Todos' || projeto.status === statusFilter;
            const matchesTipo = tipoFilter === 'Todos' || projeto.tipo === tipoFilter;
            
            return matchesSearch && matchesStatus && matchesTipo;
        });
    }, [projetos, searchTerm, statusFilter, tipoFilter]);

    const resetForm = () => {
        setFormState({
            titulo: '',
            descricao: '',
            tipo: 'Instalacao',
            clienteId: '',
            responsavelId: '',
            dataInicio: '',
            dataPrevisao: '',
            orcamentoId: ''
        });
    };

    const handleOpenModal = (projeto: Projeto | null = null) => {
        if (projeto) {
            setProjetoToEdit(projeto);
            setFormState({
                titulo: projeto.titulo,
                descricao: projeto.descricao,
                tipo: projeto.tipo,
                clienteId: projeto.clienteId,
                responsavelId: projeto.responsavelId,
                dataInicio: projeto.dataInicio,
                dataPrevisao: projeto.dataPrevisao,
                orcamentoId: projeto.orcamentoId || ''
            });
        } else {
            setProjetoToEdit(null);
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setProjetoToEdit(null);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            if (projetoToEdit) {
                // Atualizar projeto
                const response = await projetosService.atualizar(projetoToEdit.id, formState);
                if (response.success && response.data) {
                    setProjetos(prev => prev.map(p => p.id === projetoToEdit.id ? response.data! : p));
                    handleCloseModal();
                } else {
                    alert(response.message || 'Erro ao atualizar projeto');
                }
            } else {
                // Criar novo projeto
                const response = await projetosService.criar(formState);
                if (response.success && response.data) {
                    setProjetos(prev => [response.data!, ...prev]);
                    handleCloseModal();
                } else {
                    alert(response.message || 'Erro ao criar projeto');
                }
            }
        } catch (err) {
            alert('Erro ao salvar projeto');
            console.error('Erro ao salvar projeto:', err);
        }
    };

    const handleDelete = async () => {
        if (!projetoToDelete) return;
        
        try {
            const response = await projetosService.desativar(projetoToDelete.id);
            if (response.success) {
                setProjetos(prev => prev.filter(p => p.id !== projetoToDelete.id));
                setProjetoToDelete(null);
            } else {
                alert(response.message || 'Erro ao desativar projeto');
            }
        } catch (err) {
            alert('Erro ao desativar projeto');
            console.error('Erro ao desativar projeto:', err);
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Ativo': return 'bg-green-100 text-green-800';
            case 'Pendente': return 'bg-yellow-100 text-yellow-800';
            case 'Concluido': return 'bg-blue-100 text-blue-800';
            case 'Cancelado': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando projetos...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={loadData} />;
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
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">Projetos</h1>
                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Gerencie seus projetos</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Novo Projeto
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
                                    placeholder="Título, descrição, cliente..."
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="Todos">Todos</option>
                                <option value="Ativo">Ativo</option>
                                <option value="Pendente">Pendente</option>
                                <option value="Concluido">Concluído</option>
                                <option value="Cancelado">Cancelado</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                            <select
                                value={tipoFilter}
                                onChange={(e) => setTipoFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="Todos">Todos</option>
                                <option value="Instalacao">Instalação</option>
                                <option value="Manutencao">Manutenção</option>
                                <option value="Consultoria">Consultoria</option>
                                <option value="LaudoTecnico">Laudo Técnico</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={loadData}
                                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                Atualizar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de Projetos */}
            <div className="px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {filteredProjetos.map((projeto) => (
                            <li key={projeto.id} className="px-6 py-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {projeto.titulo}
                                            </p>
                                            <div className="flex items-center space-x-2">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(projeto.status)}`}>
                                                    {projeto.status}
                                                </span>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {projeto.tipo}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-1">
                                            <p className="text-sm text-gray-500">
                                                Cliente: {projeto.cliente?.nome || 'N/A'} • Responsável: {projeto.responsavel?.nome || 'N/A'}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Início: {new Date(projeto.dataInicio).toLocaleDateString('pt-BR')} • 
                                                Previsão: {new Date(projeto.dataPrevisao).toLocaleDateString('pt-BR')}
                                            </p>
                                            {projeto.descricao && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {projeto.descricao}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleOpenModal(projeto)}
                                            className="p-2 text-gray-400 hover:text-gray-600"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setProjetoToDelete(projeto)}
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

            {/* Modal de Projeto */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    {projetoToEdit ? 'Editar Projeto' : 'Novo Projeto'}
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
                                    <label className="block text-sm font-medium text-gray-700">Título</label>
                                    <input
                                        type="text"
                                        value={formState.titulo}
                                        onChange={(e) => setFormState(prev => ({ ...prev, titulo: e.target.value }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Descrição</label>
                                    <textarea
                                        value={formState.descricao}
                                        onChange={(e) => setFormState(prev => ({ ...prev, descricao: e.target.value }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tipo</label>
                                    <select
                                        value={formState.tipo}
                                        onChange={(e) => setFormState(prev => ({ ...prev, tipo: e.target.value }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Instalacao">Instalação</option>
                                        <option value="Manutencao">Manutenção</option>
                                        <option value="Consultoria">Consultoria</option>
                                        <option value="LaudoTecnico">Laudo Técnico</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Cliente</label>
                                    <select
                                        value={formState.clienteId}
                                        onChange={(e) => setFormState(prev => ({ ...prev, clienteId: e.target.value }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Selecione um cliente</option>
                                        {clientes.map(cliente => (
                                            <option key={cliente.id} value={cliente.id}>
                                                {cliente.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Responsável</label>
                                    <input
                                        type="text"
                                        value={formState.responsavelId}
                                        onChange={(e) => setFormState(prev => ({ ...prev, responsavelId: e.target.value }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="ID do responsável"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Data de Início</label>
                                        <input
                                            type="date"
                                            value={formState.dataInicio}
                                            onChange={(e) => setFormState(prev => ({ ...prev, dataInicio: e.target.value }))}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Data de Previsão</label>
                                        <input
                                            type="date"
                                            value={formState.dataPrevisao}
                                            onChange={(e) => setFormState(prev => ({ ...prev, dataPrevisao: e.target.value }))}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Orçamento (Opcional)</label>
                                    <input
                                        type="text"
                                        value={formState.orcamentoId}
                                        onChange={(e) => setFormState(prev => ({ ...prev, orcamentoId: e.target.value }))}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="ID do orçamento"
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
                                        {projetoToEdit ? 'Atualizar' : 'Criar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {projetoToDelete && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Confirmar Exclusão
                            </h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Tem certeza que deseja desativar o projeto "{projetoToDelete.titulo}"?
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setProjetoToDelete(null)}
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

export default ProjetosAPI;
