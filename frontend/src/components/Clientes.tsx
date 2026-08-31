

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    type Client, ClientType, ClientStatus, ContactPreference, ClientSource, 
    type Opportunity, OpportunityStatus, type Interaction, InteractionType,
    type Budget, BudgetStatus, ProjectType
} from '../types';
import { axiosApiService } from '../services/axiosApi';
import { ENDPOINTS } from '../config/api';
import ScrollableRow from './ui/ScrollableRow';
import { ModalDetailHeader } from './ui/ModalDetailHeader';
import { scrollableNavItemClasses, compactNavTabClasses, mobileTabBarStripClasses, modalOverlayPaddingClasses } from '../utils/responsiveNav';

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
const EllipsisVerticalIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
    </svg>
);
const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>;
const EnvelopeIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>;
const ChatBubbleLeftRightIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.722.262c-.24.017-.47.052-.696.101-1.104.296-2.133.738-3.051 1.336a11.249 11.249 0 01-3.051 1.336c-.918.497-1.943.834-3.003 1.007a11.25 11.25 0 01-1.036.096c-1.218-.08-2.393-.385-3.441-.852-1.047-.468-2.022-1.09-2.909-1.828a11.25 11.25 0 01-2.909-1.828 11.25 11.25 0 01-1.828-2.909c-.468-1.047-.772-2.223-.852-3.441a11.25 11.25 0 01.096-1.036 11.249 11.249 0 011.007-3.003 11.249 11.249 0 011.336-3.051 11.249 11.249 0 011.828-2.909c.738-.887 1.36-1.862 1.828-2.909.468-1.047.772-2.223-.852-3.441a11.25 11.25 0 01-.096-1.036A11.25 11.25 0 013.824 3c.918-.497 1.943-.834 3.003-1.007A11.249 11.249 0 018.028 2c1.218.08 2.393.385 3.441.852 1.047.468 2.022 1.09 2.909 1.828a11.25 11.25 0 012.909 1.828 11.25 11.25 0 011.828 2.909c.468 1.047.772 2.223.852-3.441a11.25 11.25 0 01.096 1.036 11.248 11.248 0 01-1.007 3.003c-.264.918-.601 1.815-1.007 2.658z" /></svg>;
const CurrencyDollarIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ClipboardDocumentListIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-7.5A2.25 2.25 0 018.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 00-2.25 2.25v6" /></svg>;


const getStatusClass = (status: ClientStatus | OpportunityStatus | BudgetStatus) => {
    const statusMap = {
        [ClientStatus.Ativo]: 'badge-status-active',
        [ClientStatus.Inativo]: 'badge-status-inactive',
        [ClientStatus.Potencial]: 'badge-status-pending',
        [ClientStatus.Retroativo]: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800',
        [OpportunityStatus.Qualificacao]: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800',
        [OpportunityStatus.Proposta]: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 ring-1 ring-cyan-200 dark:ring-cyan-800',
        [OpportunityStatus.Negociacao]: 'badge-type',
        [OpportunityStatus.Ganha]: 'badge-status-active',
        [OpportunityStatus.Perdida]: 'badge-status-inactive',
        [BudgetStatus.Aprovado]: 'badge-status-active',
        [BudgetStatus.Pendente]: 'badge-status-pending',
        [BudgetStatus.Recusado]: 'badge-status-inactive',
    };
    return statusMap[status as keyof typeof statusMap] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
};

const getStatusBorderClass = (status: ClientStatus) => {
    switch (status) {
        case ClientStatus.Ativo:
            return 'border-l-4 border-green-500';
        case ClientStatus.Inativo:
            return 'border-l-4 border-gray-400';
        case ClientStatus.Potencial:
            return 'border-l-4 border-yellow-500';
        case ClientStatus.Retroativo:
            return 'border-l-4 border-blue-500';
        default:
            return 'border-l-4 border-transparent';
    }
};


interface ClientesProps {
    toggleSidebar: () => void;
}

type ClientFormState = Omit<Client, 'id' | 'projectHistory' | 'opportunities' | 'salesOrders' | 'interactions'>;

const Clientes: React.FC<ClientesProps> = ({ toggleSidebar }) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ClientStatus | 'Todos'>('Todos');
    const [sourceFilter, setSourceFilter] = useState<ClientSource | 'Todos'>('Todos');
    const [preferenceFilter, setPreferenceFilter] = useState<ContactPreference | 'Todos'>('Todos');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [clientToView, setClientToView] = useState<Client | null>(null);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'sales' | 'service'>('details');

    const [formState, setFormState] = useState<ClientFormState>({
        name: '', type: ClientType.PessoaJuridica, document: '', contactPerson: '', phone: '', email: '', address: '', notes: '',
        status: ClientStatus.Potencial, contactPreference: ContactPreference.Telefone, source: ClientSource.Indicacao
    });

    // Carregar clientes da API
    const loadClients = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosApiService.get<Client[]>(ENDPOINTS.CLIENTES);
            if (response.success && response.data) {
                setClients(response.data);
            } else {
                setError('Erro ao carregar clientes');
            }
        } catch (err) {
            setError('Erro ao carregar clientes');
            console.error('Erro ao carregar clientes:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClients();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openDropdownId && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openDropdownId]);

    const filteredClients = useMemo(() => {
        return clients
            .filter(c => statusFilter === 'Todos' || c.status === statusFilter)
            .filter(c => sourceFilter === 'Todos' || c.source === sourceFilter)
            .filter(c => preferenceFilter === 'Todos' || c.contactPreference === preferenceFilter)
            .filter(c =>
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.document?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [clients, searchTerm, statusFilter, sourceFilter, preferenceFilter]);

    const resetForm = () => {
        setFormState({ 
            name: '', type: ClientType.PessoaJuridica, document: '', contactPerson: '', phone: '', email: '', address: '', notes: '',
            status: ClientStatus.Potencial, contactPreference: ContactPreference.Telefone, source: ClientSource.Indicacao
        });
    };

    const handleOpenModal = (client: Client | null = null) => {
        if (client) {
            setClientToEdit(client);
            setFormState({
                name: client.name,
                type: client.type,
                document: client.document || '',
                contactPerson: client.contactPerson || '',
                phone: client.phone || '',
                email: client.email || '',
                address: client.address || '',
                notes: client.notes || '',
                status: client.status,
                contactPreference: client.contactPreference,
                source: client.source,
            });
        } else {
            setClientToEdit(null);
            resetForm();
        }
        setIsModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setClientToEdit(null);
        resetForm();
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (clientToEdit) {
                // Editar cliente existente
                const response = await axiosApiService.put(`${ENDPOINTS.CLIENTES}/${clientToEdit.id}`, formState);
                if (response.success) {
                    await loadClients(); // Recarregar lista
                } else {
                    alert('Erro ao atualizar cliente');
                }
            } else {
                // Criar novo cliente
                const response = await axiosApiService.post(ENDPOINTS.CLIENTES, formState);
                if (response.success) {
                    await loadClients(); // Recarregar lista
                } else {
                    alert('Erro ao criar cliente');
                }
            }
            handleCloseModal();
        } catch (err) {
            console.error('Erro ao salvar cliente:', err);
            alert('Erro ao salvar cliente');
        }
    };
    
    const handleOpenDeleteModal = (client: Client) => { setClientToDelete(client); setOpenDropdownId(null); };
    const handleCloseDeleteModal = () => setClientToDelete(null);
    const handleConfirmDelete = async () => {
        if (clientToDelete) {
            try {
                const response = await axiosApiService.delete(`${ENDPOINTS.CLIENTES}/${clientToDelete.id}`);
                if (response.success) {
                    await loadClients(); // Recarregar lista
                } else {
                    alert('Erro ao deletar cliente');
                }
                handleCloseDeleteModal();
            } catch (err) {
                console.error('Erro ao deletar cliente:', err);
                alert('Erro ao deletar cliente');
            }
        }
    };

    const handleOpenViewModal = (client: Client) => { setActiveTab('details'); setClientToView(client); setOpenDropdownId(null); };
    const handleCloseViewModal = () => setClientToView(null);

    return (
        <div className="p-4 sm:p-8">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div className="flex items-center">
                    <button onClick={toggleSidebar} className="lg:hidden mr-4 p-1 text-brand-gray-500 rounded-md hover:bg-brand-gray-100" aria-label="Open sidebar">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-3xl font-bold text-brand-gray-800">CRM de Clientes</h1>
                        <p className="text-sm sm:text-base text-brand-gray-500">Gestão de relacionamento e contatos</p>
                    </div>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center justify-center bg-brand-blue text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-brand-blue/90 transition-colors">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Adicionar Novo Cliente
                </button>
            </header>

            <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="relative w-full sm:max-w-xs">
                        <input
                            type="text"
                            placeholder="Buscar por nome ou CPF/CNPJ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-brand-gray-200 rounded-lg focus:ring-brand-blue focus:border-brand-blue transition-all duration-200"
                        />
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray-400" />
                    </div>
                     <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-brand-gray-600">Status:</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as ClientStatus | 'Todos')}
                                className="border border-brand-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-brand-blue focus:border-brand-blue transition-all duration-200"
                            >
                                <option value="Todos">Todos</option>
                                {Object.values(ClientStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-brand-gray-600">Fonte:</span>
                            <select
                                value={sourceFilter}
                                onChange={(e) => setSourceFilter(e.target.value as ClientSource | 'Todos')}
                                className="border border-brand-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-brand-blue focus:border-brand-blue transition-all duration-200"
                            >
                                <option value="Todos">Todas</option>
                                {Object.values(ClientSource).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-brand-gray-600">Preferência:</span>
                            <select
                                value={preferenceFilter}
                                onChange={(e) => setPreferenceFilter(e.target.value as ContactPreference | 'Todos')}
                                className="border border-brand-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-brand-blue focus:border-brand-blue transition-all duration-200"
                            >
                                <option value="Todos">Todas</option>
                                {Object.values(ContactPreference).map(cp => <option key={cp} value={cp}>{cp}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="flex justify-center items-center py-8">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mx-auto mb-2"></div>
                            <p className="text-brand-gray-600">Carregando clientes...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">{error}</p>
                        <button 
                            onClick={loadClients}
                            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}

                {!loading && !error && filteredClients.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-brand-gray-500">Nenhum cliente encontrado</p>
                        <p className="text-sm text-brand-gray-400 mt-1">
                            {searchTerm || statusFilter !== 'Todos' || sourceFilter !== 'Todos' || preferenceFilter !== 'Todos' 
                                ? 'Tente ajustar os filtros de busca' 
                                : 'Comece adicionando seu primeiro cliente'
                            }
                        </p>
                    </div>
                )}

                {!loading && !error && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredClients.map((client) => (
                        <div key={client.id} className={`card-primary flex flex-col ${getStatusBorderClass(client.status)}`}>
                             <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-brand-gray-800 leading-tight flex-1 pr-2">{client.name}</h3>
                                <div className="relative">
                                    <button onClick={() => setOpenDropdownId(client.id === openDropdownId ? null : client.id)} className="p-1 -mr-2 -mt-2 rounded-full text-brand-gray-400 hover:bg-brand-gray-100">
                                        <EllipsisVerticalIcon className="w-5 h-5" />
                                    </button>
                                    {openDropdownId === client.id && (
                                        <div ref={dropdownRef} className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                            <a href="#" onClick={(e) => { e.preventDefault(); handleOpenViewModal(client); }} className="flex items-center gap-2 px-4 py-2 text-sm text-brand-gray-700 hover:bg-brand-gray-100">
                                                <EyeIcon className="w-4 h-4" /> Visualizar
                                            </a>
                                            <a href="#" onClick={(e) => { e.preventDefault(); handleOpenModal(client); }} className="flex items-center gap-2 px-4 py-2 text-sm text-brand-gray-700 hover:bg-brand-gray-100">
                                                <PencilIcon className="w-4 h-4" /> Editar
                                            </a>
                                            <a href="#" onClick={(e) => { e.preventDefault(); handleOpenDeleteModal(client); }} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                                <TrashIcon className="w-4 h-4" /> Excluir
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className='flex justify-between items-center mb-3'>
                                <p className="text-sm font-medium text-brand-blue">{client.contactPerson || 'Contato principal'}</p>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClass(client.status)}`}>{client.status}</span>
                            </div>
                            <div className="space-y-3 text-sm text-brand-gray-600 mt-auto pt-3 border-t border-brand-gray-100">
                                <div className="flex items-center gap-2">
                                    <PhoneIcon className="w-4 h-4 text-brand-gray-400" />
                                    <span>{client.phone || 'Não informado'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <EnvelopeIcon className="w-4 h-4 text-brand-gray-400" />
                                    <span>{client.email || 'Não informado'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
                    <form onSubmit={handleSubmit} className="modal-content w-full max-w-2xl max-h-full flex flex-col">
                        <div className="modal-header flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">{clientToEdit ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</h2>
                            <button type="button" onClick={handleCloseModal} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                        
                        <div className="p-6 space-y-4 overflow-y-auto">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">Status do Cliente</label>
                                    <select name="status" value={formState.status} onChange={handleInputChange} className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg bg-white transition-all duration-200 focus:ring-brand-blue focus:border-brand-blue">
                                        {Object.values(ClientStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">Tipo</label>
                                    <select name="type" value={formState.type} onChange={handleInputChange} className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg bg-white transition-all duration-200 focus:ring-brand-blue focus:border-brand-blue">
                                        <option value={ClientType.PessoaJuridica}>Pessoa Jurídica</option>
                                        <option value={ClientType.PessoaFisica}>Pessoa Física</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">
                                        {formState.type === ClientType.PessoaJuridica ? 'CNPJ' : 'CPF'}
                                    </label>
                                    <input type="text" name="document" value={formState.document} onChange={handleInputChange} className="w-full px-3 py-2 border border-brand-gray-300 rounded-lg" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Nome / Razão Social</label>
                                <input type="text" name="name" value={formState.name} onChange={handleInputChange} className="w-full px-3 py-2 border border-brand-gray-300 rounded-lg" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Pessoa de Contato</label>
                                <input type="text" name="contactPerson" value={formState.contactPerson} onChange={handleInputChange} className="w-full px-3 py-2 border border-brand-gray-300 rounded-lg" />
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">Telefone</label>
                                    <input type="tel" name="phone" value={formState.phone} onChange={handleInputChange} className="w-full px-3 py-2 border border-brand-gray-300 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">Email</label>
                                    <input type="email" name="email" value={formState.email} onChange={handleInputChange} className="w-full px-3 py-2 border border-brand-gray-300 rounded-lg" />
                                </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">Preferência de Contato</label>
                                    <select name="contactPreference" value={formState.contactPreference} onChange={handleInputChange} className="w-full px-3 py-2 border border-brand-gray-200 rounded-lg bg-white transition-all duration-200 focus:ring-brand-blue focus:border-brand-blue">
                                        {Object.values(ContactPreference).map(cp => <option key={cp} value={cp}>{cp}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700 mb-1">Como nos conheceu?</label>
                                    <select name="source" value={formState.source} onChange={handleInputChange} className="w-full px-3 py-2 border border-brand-gray-300 rounded-lg bg-white">
                                         {Object.values(ClientSource).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Endereço</label>
                                <textarea name="address" value={formState.address} onChange={handleInputChange} rows={2} className="w-full px-3 py-2 border border-brand-gray-300 rounded-lg" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-brand-gray-700 mb-1">Observações</label>
                                <textarea name="notes" value={formState.notes} onChange={handleInputChange} rows={3} className="w-full px-3 py-2 border border-brand-gray-300 rounded-lg" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancelar</button>
                            <button type="submit" className="btn-primary">{clientToEdit ? 'Salvar Alterações' : 'Salvar Cliente'}</button>
                        </div>
                    </form>
                </div>
            )}
            
            {clientToDelete && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-brand-gray-800">Confirmar Exclusão</h2>
                            <p className="text-sm text-brand-gray-600 mt-2">
                                Você tem certeza que deseja excluir o cliente <strong className="text-brand-gray-800">{clientToDelete.name}</strong>?
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" onClick={handleCloseDeleteModal} className="btn-secondary">Cancelar</button>
                            <button type="button" onClick={handleConfirmDelete} className="btn-danger">Confirmar Exclusão</button>
                        </div>
                    </div>
                </div>
            )}
            
            {clientToView && (
                <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${modalOverlayPaddingClasses}`}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <ModalDetailHeader
                            onClose={handleCloseViewModal}
                            title={clientToView.name}
                            subtitle={clientToView.document || 'Documento não informado'}
                        />

                        <div className={`shrink-0 px-3 sm:px-6 ${mobileTabBarStripClasses}`}>
                             <ScrollableRow as="nav" ariaLabel="Abas do cliente" edgeToEdge className="gap-4 -mb-px">
                                <button onClick={() => setActiveTab('details')} className={`${scrollableNavItemClasses} ${compactNavTabClasses} py-3 px-1 border-b-2 font-semibold text-sm ${activeTab === 'details' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}>Detalhes</button>
                                <button onClick={() => setActiveTab('sales')} className={`${scrollableNavItemClasses} ${compactNavTabClasses} py-3 px-1 border-b-2 font-semibold text-sm ${activeTab === 'sales' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}>Vendas</button>
                                <button onClick={() => setActiveTab('service')} className={`${scrollableNavItemClasses} ${compactNavTabClasses} py-3 px-1 border-b-2 font-semibold text-sm ${activeTab === 'service' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}>Atendimento</button>
                            </ScrollableRow>
                        </div>
                        
                        <div className="p-6 space-y-6 overflow-y-auto">
                           {activeTab === 'details' && (
                               <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                        <div><strong className="block text-brand-gray-500">Tipo</strong>{clientToView.type}</div>
                                        <div><strong className="block text-brand-gray-500">Status</strong><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClass(clientToView.status)}`}>{clientToView.status}</span></div>
                                        <div><strong className="block text-brand-gray-500">Contato Principal</strong>{clientToView.contactPerson || 'Não informado'}</div>
                                        <div><strong className="block text-brand-gray-500">Telefone</strong>{clientToView.phone || 'Não informado'}</div>
                                        <div className="sm:col-span-2"><strong className="block text-brand-gray-500">Email</strong>{clientToView.email || 'Não informado'}</div>
                                        <div><strong className="block text-brand-gray-500">Preferência de Contato</strong>{clientToView.contactPreference}</div>
                                        <div><strong className="block text-brand-gray-500">Fonte</strong>{clientToView.source}</div>
                                        <div className="sm:col-span-2"><strong className="block text-brand-gray-500">Endereço</strong>{clientToView.address || 'Não informado'}</div>
                                    </div>
                                    {clientToView.notes && (
                                        <div className="pt-4 border-t border-brand-gray-100">
                                            <strong className="block text-sm font-bold text-brand-gray-800">Observações</strong>
                                            <p className="text-sm text-brand-gray-700 whitespace-pre-wrap mt-1">{clientToView.notes}</p>
                                        </div>
                                    )}
                               </div>
                           )}
                           {activeTab === 'sales' && (
                               <div className="space-y-6">
                                   <div>
                                       <h4 className="text-lg font-semibold text-brand-gray-800 mb-2">Oportunidades</h4>
                                       <div className="border rounded-lg overflow-hidden">
                                            <table className="min-w-full">
                                                <thead className="bg-brand-gray-50 text-xs text-brand-gray-500 uppercase">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">Título</th>
                                                        <th className="px-4 py-2 text-right">Valor</th>
                                                        <th className="px-4 py-2 text-center">Status</th>
                                                        <th className="px-4 py-2 text-left">Data</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y text-sm">
                                                    {clientToView.opportunities.map(op => (
                                                        <tr key={op.id}>
                                                            <td className="px-4 py-2 font-medium">{op.title}</td>
                                                            <td className="px-4 py-2 text-right">R$ {op.value.toLocaleString('pt-BR')}</td>
                                                            <td className="px-4 py-2 text-center"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClass(op.status)}`}>{op.status}</span></td>
                                                            <td className="px-4 py-2">{op.createdDate}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                       </div>
                                   </div>
                                   <div>
                                       <h4 className="text-lg font-semibold text-brand-gray-800 mb-2">Orçamentos</h4>
                                       <div className="border rounded-lg overflow-hidden">
                                            <table className="min-w-full">
                                                 <thead className="bg-brand-gray-50 text-xs text-brand-gray-500 uppercase">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">ID</th>
                                                        <th className="px-4 py-2 text-left">Projeto</th>
                                                        <th className="px-4 py-2 text-right">Total</th>
                                                        <th className="px-4 py-2 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y text-sm">
                                                   {budgetsData.filter(b => b.clientId === clientToView.id).map(budget => (
                                                       <tr key={budget.id}>
                                                            <td className="px-4 py-2 font-mono text-brand-blue">{budget.id}</td>
                                                            <td className="px-4 py-2 font-medium">{budget.projectName}</td>
                                                            <td className="px-4 py-2 text-right">R$ {budget.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                                            <td className="px-4 py-2 text-center"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClass(budget.status)}`}>{budget.status}</span></td>
                                                       </tr>
                                                   ))}
                                                </tbody>
                                            </table>
                                       </div>
                                   </div>
                               </div>
                           )}
                           {activeTab === 'service' && (
                               <div className="space-y-6">
                                   <div>
                                       <h4 className="text-lg font-semibold text-brand-gray-800 mb-2">Histórico de Atendimento</h4>
                                       <div className="border rounded-lg overflow-hidden">
                                            <table className="min-w-full">
                                                <thead className="bg-brand-gray-50 text-xs text-brand-gray-500 uppercase">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">Data</th>
                                                        <th className="px-4 py-2 text-left">Tipo</th>
                                                        <th className="px-4 py-2 text-left">Resumo</th>
                                                        <th className="px-4 py-2 text-left">Usuário</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y text-sm">
                                                    {clientToView.interactions.map(interaction => (
                                                        <tr key={interaction.id}>
                                                            <td className="px-4 py-2">{interaction.date}</td>
                                                            <td className="px-4 py-2">{interaction.type}</td>
                                                            <td className="px-4 py-2">{interaction.summary}</td>
                                                            <td className="px-4 py-2">{interaction.user}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {clientToView.interactions.length === 0 && (
                                                <p className="text-center text-sm text-brand-gray-500 p-4">Nenhuma interação registrada.</p>
                                            )}
                                       </div>
                                   </div>
                                   <div>
                                       <h4 className="text-lg font-semibold text-brand-gray-800 mb-2">Histórico de Projetos</h4>
                                       <div className="space-y-2">
                                           {clientToView.projectHistory.map(proj => (
                                               <div key={proj.projectId} className="p-3 bg-brand-gray-50 rounded-lg text-sm">
                                                   <p className="font-semibold">{proj.projectName}</p>
                                                   <p className="text-xs text-brand-gray-500">Concluído em: {proj.date}</p>
                                               </div>
                                           ))}
                                           {clientToView.projectHistory.length === 0 && (
                                                <p className="text-center text-sm text-brand-gray-500 p-4">Nenhum projeto anterior registrado.</p>
                                           )}
                                       </div>
                                   </div>
                               </div>
                           )}
                        </div>
                        
                         <div className="p-4 bg-brand-gray-50 border-t border-brand-gray-200 flex justify-end">
                            <button onClick={handleCloseViewModal} className="px-4 py-2 bg-white border border-brand-gray-300 text-brand-gray-700 font-semibold rounded-lg hover:bg-brand-gray-50">Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clientes;