import React, { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { type Service, ServiceType } from '../types';
import { servicosService, type Servico } from '../services/servicosService';
import { useSKey } from '../hooks/useSKey';

// Icons
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>;
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const MagnifyingGlassIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>;
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.038-2.124H9.038c-1.128 0-2.038.944-2.038 2.124v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const WrenchScrewdriverIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></svg>;
const ArrowPathIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>;
const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const FolderIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>;

const getTypeClass = (type: ServiceType) => {
    switch (type) {
        case ServiceType.Consultoria: return 'bg-green-100 text-green-800 ring-1 ring-green-200';
        case ServiceType.Instalacao: return 'bg-blue-100 text-blue-800 ring-1 ring-blue-200';
        case ServiceType.Manutencao: return 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200';
        case ServiceType.LaudoTecnico: return 'bg-purple-100 text-purple-800 ring-1 ring-purple-200';
        default: return 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
    }
};

const getTypeIcon = (type: ServiceType) => {
    switch (type) {
        case ServiceType.Consultoria: return '💡';
        case ServiceType.Instalacao: return '🔧';
        case ServiceType.Manutencao: return '⚙️';
        case ServiceType.LaudoTecnico: return '📐';
        default: return '🛠️';
    }
};

interface ServicosProps {
    toggleSidebar: () => void;
}

// FIX: Correctly define ServiceFormState to avoid 'price' property becoming 'never'
// by omitting 'price' from the base type before intersecting with the new 'price' type.
type ServiceFormState = Omit<Service, 'id' | 'price'> & { price: string };

const Servicos: React.FC<ServicosProps> = ({ toggleSidebar }) => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<ServiceType | 'Todos'>('Todos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
    const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    const [formState, setFormState] = useState<ServiceFormState>({
        name: '', internalCode: '', description: '', type: ServiceType.Instalacao, price: ''
    });

    // Carregar serviços do backend
    useEffect(() => {
        loadServices();
    }, []);

    const loadServices = async () => {
        try {
            setLoading(true);
            const response = await servicosService.listar();
            
            if (response.success && response.data) {
                // Converter serviços da API para o formato do componente
                const servicosArray = Array.isArray(response.data) ? response.data : [];
                const servicesFormatados: Service[] = servicosArray.map((serv: Servico) => ({
                    id: serv.id,
                    name: serv.nome,
                    internalCode: serv.codigo,
                    description: serv.descricao || '',
                    type: serv.tipo as ServiceType,
                    price: serv.preco
                }));
                
                setServices(servicesFormatados);
            } else {
                console.warn('Nenhum serviço encontrado ou erro na resposta:', response);
                setServices([]);
            }
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
            setServices([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openDropdownId && dropdownRefs.current[openDropdownId] && !dropdownRefs.current[openDropdownId]?.contains(event.target as Node)) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openDropdownId]);

    const filteredServices = useMemo(() => {
        return services
            .filter(s => typeFilter === 'Todos' || s.type === typeFilter)
            .filter(s =>
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.internalCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [services, searchTerm, typeFilter]);

    // Estatísticas calculadas
    const stats = useMemo(() => {
        const total = services.length;
        const ativos = services.filter(s => s.price > 0).length; // Considera ativo se tem preço
        const inativos = total - ativos;
        const precoMedio = total > 0 ? services.reduce((sum, s) => sum + s.price, 0) / total : 0;
        
        return { total, ativos, inativos, precoMedio };
    }, [services]);

    const resetForm = () => {
        setFormState({ name: '', internalCode: '', description: '', type: ServiceType.Instalacao, price: '' });
    };

    const handleOpenModal = (service: Service | null = null) => {
        if (service) {
            setServiceToEdit(service);
            setFormState({ ...service, price: String(service.price) });
        } else {
            setServiceToEdit(null);
            resetForm();
        }
        setIsModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setServiceToEdit(null);
        resetForm();
    };

    // Fechar modal com tecla S
    useSKey(isModalOpen, handleCloseModal);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const priceValue = parseFloat(formState.price);
        if (isNaN(priceValue) || priceValue < 0) {
            toast.error("O preço deve ser um número válido.");
            return;
        }

        try {
            if (serviceToEdit) {
                // Atualizar serviço existente
                const servicoData = {
                    nome: formState.name,
                    codigo: formState.internalCode,
                    descricao: formState.description,
                    tipo: formState.type,
                    preco: priceValue,
                    unidade: 'un'
                };
                
                const response = await servicosService.atualizar(serviceToEdit.id, servicoData);
                
                if (response.success) {
                    toast.error('✅ Serviço atualizado com sucesso!');
                    handleCloseModal();
                    await loadServices();
                } else {
                    toast.error(`❌ Erro ao atualizar serviço: ${response.error || 'Erro desconhecido'}`);
                }
            } else {
                // Criar novo serviço
                const servicoData = {
                    nome: formState.name,
                    codigo: formState.internalCode,
                    descricao: formState.description,
                    tipo: formState.type,
                    preco: priceValue,
                    unidade: 'un'
                };
                
                const response = await servicosService.criar(servicoData);
                
                if (response.success) {
                    toast.error('✅ Serviço criado com sucesso!');
                    handleCloseModal();
                    await loadServices();
                } else {
                    toast.error(`❌ Erro ao criar serviço: ${response.error || 'Erro desconhecido'}`);
                }
            }
        } catch (error) {
            console.error('Erro ao salvar serviço:', error);
            toast.error('❌ Erro ao salvar serviço. Verifique o console para mais detalhes.');
        }
    };

    const handleOpenDeleteModal = (service: Service) => { setServiceToDelete(service); setOpenDropdownId(null); };
    const handleCloseDeleteModal = () => setServiceToDelete(null);
    const handleConfirmDelete = async () => {
        if (!serviceToDelete) return;
        
        try {
            const response = await servicosService.desativar(serviceToDelete.id);
            
            if (response.success) {
                toast.error('✅ Serviço removido com sucesso!');
                handleCloseDeleteModal();
                await loadServices();
            } else {
                toast.error(`❌ Erro ao remover serviço: ${response.error || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error('Erro ao remover serviço:', error);
            toast.error('❌ Erro ao remover serviço. Verifique o console para mais detalhes.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando serviços...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 rounded-xl hover:bg-white hover:shadow-md transition-all">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">Serviços</h1>
                        <p className="text-sm sm:text-base text-gray-500 mt-1">Gerencie serviços e especialidades técnicas</p>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-600 transition-all shadow-lg font-semibold"
                >
                    <PlusIcon className="w-5 h-5" />
                    Novo Serviço
                </button>
            </header>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center">
                            <WrenchScrewdriverIcon className="w-6 h-6 text-cyan-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total de Serviços</p>
                            <p className="text-2xl font-bold text-cyan-600">{stats.total}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all">
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

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all">
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

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all">
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

            {/* Filtros */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 mb-6">
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
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as ServiceType | 'Todos')}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="Todos">Todos os Tipos</option>
                            {Object.values(ServiceType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div>
                        <select
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="Todos">Todos os Status</option>
                            <option value="Ativos">Ativos</option>
                            <option value="Inativos">Inativos</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Exibindo <span className="font-bold text-gray-900">{filteredServices.length}</span> de <span className="font-bold text-gray-900">{services.length}</span> serviços
                    </p>
                </div>
            </div>

            {/* Grid de Serviços */}
            {filteredServices.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">🛠️</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhum serviço encontrado</h3>
                    <p className="text-gray-500 mb-6">
                        {searchTerm || typeFilter !== 'Todos'
                            ? 'Tente ajustar os filtros de busca'
                            : 'Comece cadastrando seus primeiros serviços'}
                    </p>
                    {!searchTerm && typeFilter === 'Todos' && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white px-6 py-3 rounded-xl hover:from-cyan-700 hover:to-cyan-600 transition-all shadow-lg font-semibold"
                        >
                            <PlusIcon className="w-5 h-5 inline mr-2" />
                            Cadastrar Primeiro Serviço
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredServices.map((service) => (
                        <div key={service.id} className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-200 hover:border-cyan-300">
                            {/* Header do Card */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{service.name}</h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${getTypeClass(service.type)}`}>
                                            {getTypeIcon(service.type)} {service.type}
                                        </span>
                                    </div>
                                </div>
                                <span className="px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm bg-green-100 text-green-800 ring-1 ring-green-200">
                                    ✅ Ativo
                                </span>
                            </div>

                            {/* Informações */}
                            <div className="space-y-2 mb-4">
                                <div className="text-sm text-gray-600">
                                    <p className="line-clamp-2">{service.description || 'Sem descrição'}</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <FolderIcon className="w-4 h-4" />
                                    <span className="truncate">{service.type}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <ClockIcon className="w-4 h-4" />
                                    <span>Código: {service.internalCode}</span>
                                </div>
                            </div>

                            {/* Preço */}
                            <div className="bg-cyan-50 border border-cyan-200 p-3 rounded-xl mb-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-cyan-800">Preço:</span>
                                    <div className="text-right">
                                        <span className="text-xl font-bold text-cyan-700">
                                            R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                        <p className="text-xs text-cyan-600">/projeto</p>
                                    </div>
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                <button
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-semibold"
                                >
                                    <EyeIcon className="w-4 h-4" />
                                    Ver
                                </button>
                                <button
                                    onClick={() => handleOpenModal(service)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition-colors text-sm font-semibold"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleOpenDeleteModal(service)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-semibold"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                    Desativar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL DE CRIAÇÃO/EDIÇÃO */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
                        {/* Header */}
                        <div className="relative p-6 border-b border-gray-100 dark:border-dark-border bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center shadow-lg ring-2 ring-cyan-100">
                                    {serviceToEdit ? <PencilIcon className="w-7 h-7 text-white" /> : <PlusIcon className="w-7 h-7 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                                        {serviceToEdit ? 'Editar Serviço' : 'Novo Serviço'}
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                                        {serviceToEdit ? 'Atualize as informações do serviço' : 'Cadastre um novo serviço técnico'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="absolute top-4 right-4 p-2 text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Informações Básicas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Nome do Serviço *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formState.name}
                                        onChange={handleInputChange}
                                        required
                                        className="input-field"
                                        placeholder="Ex: Instalação Elétrica Residencial"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Código Interno *
                                    </label>
                                    <input
                                        type="text"
                                        name="internalCode"
                                        value={formState.internalCode}
                                        onChange={handleInputChange}
                                        required
                                        className="input-field"
                                        placeholder="SRV-001"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Tipo de Serviço
                                    </label>
                                    <select
                                        name="type"
                                        value={formState.type}
                                        onChange={handleInputChange}
                                        className="select-field"
                                    >
                                        {Object.values(ServiceType).map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Descrição
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formState.description}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="textarea-field"
                                        placeholder="Descreva detalhadamente o serviço oferecido..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Preço (R$) *
                                    </label>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formState.price}
                                        onChange={handleInputChange}
                                        required
                                        min="0"
                                        step="0.01"
                                        className="input-field"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-dark-border">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="btn-secondary"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-info"
                                >
                                    {serviceToEdit ? 'Atualizar' : 'Cadastrar'} Serviço
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
            {serviceToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Desativar Serviço</h3>
                        <p className="text-gray-600 mb-6">
                            Tem certeza que deseja desativar o serviço <strong className="text-gray-900">"{serviceToDelete.name}"</strong>? 
                            O serviço ficará inativo mas poderá ser reativado futuramente.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleCloseDeleteModal}
                                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDelete}
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

export default Servicos;
