import React, { useState, useMemo, useEffect, useContext } from 'react';
import { toast } from 'sonner';
import { clientesService, type Cliente, type CreateClienteData } from '../services/clientesService';
import { AuthContext } from '../contexts/AuthContext';
import { canDelete } from '../utils/permissions';
import AlertDialog from './ui/AlertDialog';
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

interface ClientesProps {
    toggleSidebar: () => void;
}

const ClientesModerno: React.FC<ClientesProps> = ({ toggleSidebar }) => {
    const { user } = useContext(AuthContext)!;
    
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFilter, setTipoFilter] = useState<'Todos' | 'PF' | 'PJ'>('Todos');
    const [ativoFilter, setAtivoFilter] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clienteToEdit, setClienteToEdit] = useState<Cliente | null>(null);
    const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePermanent, setDeletePermanent] = useState(false); // true = permanente, false = soft delete

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

    useEffect(() => {
        loadClientes();
    }, []);

    const loadClientes = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('👥 Iniciando carregamento de clientes...');
            
            const response = await clientesService.listar();
            
            if (response.success && response.data) {
                setClientes(response.data);
                console.log(`✅ ${response.data.length} clientes carregados com sucesso`);
            } else {
                const errorMsg = response.error || 'Erro ao carregar clientes';
                setError(errorMsg);
                console.warn('⚠️ Erro ao carregar clientes:', errorMsg);
            }
        } catch (err) {
            const errorMsg = 'Erro de conexão ao carregar clientes';
            setError(errorMsg);
            console.error('❌ Erro crítico:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredClientes = useMemo(() => {
        return clientes.filter(cliente => {
            const matchesSearch = cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                cliente.cpfCnpj.includes(searchTerm) ||
                                (cliente.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            
            const matchesTipo = tipoFilter === 'Todos' || cliente.tipo === tipoFilter;
            const matchesAtivo = ativoFilter === 'Todos' || 
                               (ativoFilter === 'Ativo' ? cliente.ativo : !cliente.ativo);
            
            return matchesSearch && matchesTipo && matchesAtivo;
        });
    }, [clientes, searchTerm, tipoFilter, ativoFilter]);

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
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            console.log('💾 Salvando cliente...', formState);
            
            let response;
            if (clienteToEdit) {
                response = await clientesService.atualizar(clienteToEdit.id, formState);
            } else {
                response = await clientesService.criar(formState);
            }
            
            if (response.success) {
                console.log('✅ Cliente salvo com sucesso');
                await loadClientes();
                setIsModalOpen(false);
                
                // Mostrar mensagem de sucesso
                toast.success(`Cliente ${clienteToEdit ? 'atualizado' : 'criado'}!`, {
                    description: clienteToEdit ? 'Alterações salvas' : 'Novo cliente cadastrado'
                });
            } else {
                const errorMsg = response.error || 'Erro ao salvar cliente';
                console.warn('⚠️ Erro ao salvar:', errorMsg);
                toast.error('Erro ao salvar cliente', { description: errorMsg });
            }
        } catch (err) {
            console.error('❌ Erro crítico ao salvar:', err);
            toast.error('Erro de conexão', { description: 'Não foi possível salvar o cliente' });
        }
    };


    // Fechar modais com ESC
    useEscapeKey(isModalOpen, () => setIsModalOpen(false));
    useEscapeKey(!!clienteToDelete, () => setClienteToDelete(null));

    const handleDelete = async () => {
        if (!clienteToDelete) return;
        
        try {
            const action = deletePermanent ? 'Excluindo permanentemente' : 'Desativando';
            console.log(`🗑️ ${action} cliente ${clienteToDelete.id}...`);
            
            const response = await clientesService.desativar(clienteToDelete.id, deletePermanent);
            
            if (response.success) {
                console.log('✅ Cliente processado com sucesso');
                const message = deletePermanent 
                    ? `Cliente "${clienteToDelete.nome}" foi excluído permanentemente do banco de dados`
                    : `Cliente "${clienteToDelete.nome}" foi desativado com sucesso`;
                toast.success(deletePermanent ? 'Cliente excluído' : 'Cliente desativado', {
                    description: message
                });
                await loadClientes();
            } else {
                const errorMsg = response.error || 'Erro ao processar cliente';
                console.warn('⚠️ Erro:', errorMsg);
                toast.error('Erro ao excluir', { description: errorMsg });
            }
        } catch (err) {
            console.error('❌ Erro crítico:', err);
            toast.error('Erro de conexão', { description: 'Não foi possível excluir o cliente' });
        }
        
        setShowDeleteDialog(false);
        setClienteToDelete(null);
        setDeletePermanent(false);
    };

    const handleReativar = async (cliente: Cliente) => {
        toast(`Reativar cliente "${cliente.nome}"?`, {
            action: {
                label: 'Reativar',
                onClick: async () => {
                    const promise = (async () => {
                        console.log(`🔄 Reativando cliente ${cliente.id}...`);
                        const response = await clientesService.reativar(cliente.id);
                        
                        if (response.success) {
                            console.log('✅ Cliente reativado com sucesso');
                            await loadClientes();
                            return cliente.nome;
                        } else {
                            const errorMsg = response.error || 'Erro ao reativar cliente';
                            console.warn('⚠️ Erro ao reativar:', errorMsg);
                            throw new Error(errorMsg);
                        }
                    })();

                    toast.promise(promise, {
                        loading: 'Reativando cliente...',
                        success: (nome) => `${nome} reativado!`,
                        error: (err) => err.message || 'Erro ao reativar'
                    });
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando clientes...</p>
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
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">Clientes</h1>
                        <p className="text-sm sm:text-base text-gray-500 mt-1">Gerencie seus clientes e parceiros</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={loadClientes}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all font-semibold disabled:opacity-50"
                        title="Recarregar dados"
                    >
                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {loading ? 'Carregando...' : 'Atualizar'}
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Novo Cliente
                    </button>
                </div>
            </header>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <p className="text-red-800 font-medium">⚠️ {error}</p>
                        <button 
                            onClick={loadClientes}
                            className="text-red-700 hover:text-red-900 font-medium underline"
                        >
                            Tentar novamente
                        </button>
                    </div>
                </div>
            )}

            {/* Filtros */}
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, CPF/CNPJ ou email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                    </div>

                    <div>
                        <select
                            value={tipoFilter}
                            onChange={(e) => setTipoFilter(e.target.value as any)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                        >
                            <option value="Todos">Todos os Tipos</option>
                            <option value="PF">Pessoa Física</option>
                            <option value="PJ">Pessoa Jurídica</option>
                        </select>
                    </div>

                    <div>
                        <select
                            value={ativoFilter}
                            onChange={(e) => setAtivoFilter(e.target.value as any)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                        >
                            <option value="Todos">Todos os Status</option>
                            <option value="Ativo">Ativos</option>
                            <option value="Inativo">Inativos</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Exibindo <span className="font-bold text-gray-900">{filteredClientes.length}</span> de <span className="font-bold text-gray-900">{clientes.length}</span> clientes
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Ativo: {clientes.filter(c => c.ativo).length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-xs text-gray-600">Inativo: {clientes.filter(c => !c.ativo).length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${error ? 'bg-red-500' : clientes.length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                            <span className="text-xs text-gray-600">
                                {error ? 'API Error' : clientes.length > 0 ? 'API Online' : 'Carregando...'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid de Clientes */}
            {filteredClientes.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">👥</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhum cliente encontrado</h3>
                    <p className="text-gray-500 mb-6">
                        {searchTerm || tipoFilter !== 'Todos' || ativoFilter !== 'Todos'
                            ? 'Tente ajustar os filtros de busca'
                            : 'Comece adicionando seu primeiro cliente'}
                    </p>
                    {!searchTerm && tipoFilter === 'Todos' && ativoFilter === 'Todos' && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                        >
                            <PlusIcon className="w-5 h-5 inline mr-2" />
                            Adicionar Primeiro Cliente
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClientes.map((cliente) => (
                        <div key={cliente.id} className={`bg-white border-2 rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-200 ${
                            cliente.ativo ? 'border-gray-200 hover:border-green-300' : 'border-red-200 hover:border-red-300 opacity-75'
                        }`}>
                            {/* Header do Card */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-900 mb-1">{cliente.nome}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${
                                            cliente.tipo === 'PF' 
                                                ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-200' 
                                                : 'bg-purple-100 text-purple-800 ring-1 ring-purple-200'
                                        }`}>
                                            {cliente.tipo === 'PF' ? '👤 Pessoa Física' : '🏢 Pessoa Jurídica'}
                                        </span>
                                    </div>
                                </div>
                                <span className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${
                                    cliente.ativo 
                                        ? 'bg-green-100 text-green-800 ring-1 ring-green-200' 
                                        : 'bg-red-100 text-red-800 ring-1 ring-red-200'
                                }`}>
                                    {cliente.ativo ? '✓ Ativo' : '⚠ Inativo'}
                                </span>
                            </div>

                            {/* Informações */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{cliente.cpfCnpj}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>📧</span>
                                    <span className="truncate">{cliente.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>📱</span>
                                    <span>{cliente.telefone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span>📍</span>
                                    <span className="truncate">{cliente.cidade}, {cliente.estado}</span>
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                {cliente.ativo ? (
                                    <>
                                        <button
                                            onClick={() => handleOpenModal(cliente)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                            Editar
                                        </button>
                                        {canDelete(user) ? (
                                            // Desenvolvedor/Admin: dois botões
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setClienteToDelete(cliente);
                                                        setDeletePermanent(false);
                                                        setShowDeleteDialog(true);
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-semibold"
                                                    title="Desativar cliente (pode ser reativado)"
                                                >
                                                    <ArrowPathIcon className="w-4 h-4" />
                                                    Desativar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setClienteToDelete(cliente);
                                                        setDeletePermanent(true);
                                                        setShowDeleteDialog(true);
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
                                                    title="Excluir permanentemente do banco de dados"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                    Excluir
                                                </button>
                                            </>
                                        ) : (
                                            // Outros usuários: apenas desativar
                                            <button
                                                onClick={() => {
                                                    setClienteToDelete(cliente);
                                                    setDeletePermanent(false);
                                                    setShowDeleteDialog(true);
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-semibold"
                                                title="Desativar cliente"
                                            >
                                                <ArrowPathIcon className="w-4 h-4" />
                                                Desativar
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleReativar(cliente)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                                    >
                                        <ArrowPathIcon className="w-5 h-5" />
                                        Reativar Cliente
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
                        <div className="relative p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-green-600 to-green-700">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-medium">
                                    {clienteToEdit ? <PencilIcon className="w-7 h-7 text-white" /> : <PlusIcon className="w-7 h-7 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-white">
                                        {clienteToEdit ? 'Editar Cliente' : 'Novo Cliente'}
                                    </h2>
                                    <p className="text-sm text-white/80 mt-1">
                                        {clienteToEdit ? 'Atualize as informações do cliente' : 'Preencha os dados para cadastrar um novo cliente'}
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
                            {/* Tipo de Pessoa */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Tipo de Pessoa *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormState({...formState, tipo: 'PF'})}
                                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-semibold ${
                                            formState.tipo === 'PF'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                                        }`}
                                    >
                                        <span className="text-xl">👤</span>
                                        Pessoa Física
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormState({...formState, tipo: 'PJ'})}
                                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-semibold ${
                                            formState.tipo === 'PJ'
                                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                                        }`}
                                    >
                                        <span className="text-xl">🏢</span>
                                        Pessoa Jurídica
                                    </button>
                                </div>
                            </div>

                            {/* Informações Básicas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {formState.tipo === 'PF' ? 'Nome Completo' : 'Razão Social'} *
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.nome}
                                        onChange={(e) => setFormState({...formState, nome: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                                        placeholder={formState.tipo === 'PF' ? 'Ex: João Silva' : 'Ex: Empresa LTDA'}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {formState.tipo === 'PF' ? 'CPF' : 'CNPJ'} *
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.cpfCnpj}
                                        onChange={(e) => setFormState({...formState, cpfCnpj: e.target.value})}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                                        placeholder={formState.tipo === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                                        placeholder="email@exemplo.com"
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                                        placeholder="(00) 00000-0000"
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                                        placeholder="Rua, número, bairro"
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="">Selecione</option>
                                        <option value="SC">Santa Catarina</option>
                                        <option value="PR">Paraná</option>
                                        <option value="RS">Rio Grande do Sul</option>
                                        <option value="SP">São Paulo</option>
                                        <option value="RJ">Rio de Janeiro</option>
                                        <option value="MG">Minas Gerais</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        CEP
                                    </label>
                                    <input
                                        type="text"
                                        value={formState.cep}
                                        onChange={(e) => setFormState({...formState, cep: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                                        placeholder="00000-000"
                                    />
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
                                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                                >
                                    {clienteToEdit ? 'Atualizar' : 'Cadastrar'} Cliente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
            {/* AlertDialog de Confirmação de Exclusão */}
            <AlertDialog
                isOpen={showDeleteDialog}
                onClose={() => {
                    setShowDeleteDialog(false);
                    setClienteToDelete(null);
                    setDeletePermanent(false);
                }}
                onConfirm={handleDelete}
                title={deletePermanent 
                    ? `Excluir permanentemente cliente "${clienteToDelete?.nome || 'N/A'}"?`
                    : `Desativar cliente "${clienteToDelete?.nome || 'N/A'}"?`}
                message={deletePermanent 
                    ? `Tem certeza que deseja excluir permanentemente o cliente "${clienteToDelete?.nome}"? Esta ação não pode ser desfeita e removerá o registro do banco de dados.`
                    : `Tem certeza que deseja desativar este cliente? O cliente ficará inativo mas poderá ser reativado futuramente.`}
                confirmText={deletePermanent ? "Excluir Permanentemente" : "Desativar"}
                cancelText="Cancelar"
                variant={deletePermanent ? "danger" : "warning"}
            />
        </div>
    );
};

export default ClientesModerno;

