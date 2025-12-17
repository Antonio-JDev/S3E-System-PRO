import React, { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { type Service, ServiceType } from '../types';
import { servicosService, type Servico } from '../services/servicosService';
import { useSKey } from '../hooks/useSKey';
import ActionsDropdown from './ui/ActionsDropdown';
import { 
    generateEmptyTemplate, 
    generateExampleTemplate, 
    exportToJSON, 
    readJSONFile, 
    validateImportData, 
    downloadJSON,
    type ServicosImportData,
    type ImportResult
} from '../utils/servicosImportExport';
import {
    gerarProximoCodigo,
    formatTipoServicoNome,
    getTipoServicoStyle,
    type TipoServicoClassificacao
} from '../utils/servicoCodeGenerator';

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
const ArrowDownTrayIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>;
const ArrowUpTrayIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;
const DocumentTextIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const Squares2X2Icon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>;
const ListBulletIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;

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
type ServiceFormState = {
    nome: string;
    codigo: string;
    descricao: string;
    tipo: ServiceType;
    tipoServico: 'MAO_DE_OBRA' | 'MONTAGEM' | 'ENGENHARIA' | 'PROJETOS' | 'ADMINISTRATIVO'; // ✅ NOVO: Tipo de serviço
    price: string; 
    unidade: string;
    name: string;
    internalCode: string;
    description: string;
    type: ServiceType;
};

const Servicos: React.FC<ServicosProps> = ({ toggleSidebar }) => {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<ServiceType | 'Todos'>('Todos');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
    const [serviceToView, setServiceToView] = useState<Service | null>(null);
    const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // ✅ NOVOS ESTADOS: Importação/Exportação
    const [showImportModal, setShowImportModal] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // ✅ NOVOS ESTADOS: Classificação e Visualização
    const [tipoServicoFilter, setTipoServicoFilter] = useState<TipoServicoClassificacao | 'TODOS' | 'ENGENHARIA_PROJETOS'>('TODOS');
    const [viewModeClassificacao, setViewModeClassificacao] = useState<'separada' | 'completa'>('separada');
    const [showImportPreview, setShowImportPreview] = useState(false);
    const [importPreviewData, setImportPreviewData] = useState<any[]>([]);

    const [formState, setFormState] = useState<ServiceFormState>({
        nome: '',
        codigo: '',
        descricao: '',
        tipo: ServiceType.Instalacao,
        tipoServico: 'MAO_DE_OBRA', // ✅ NOVO: Tipo de serviço padrão
        price: '',
        unidade: 'un',
        name: '',
        internalCode: '',
        description: '',
        type: ServiceType.Instalacao
    });

    // Carregar serviços do backend
    useEffect(() => {
        loadServices();
    }, []);

    // Gerar código automaticamente quando tipoServico mudar (apenas para novos serviços)
    useEffect(() => {
        if (!serviceToEdit && formState.tipoServico) {
            const novoCodigo = gerarProximoCodigo(services, formState.tipoServico);
            setFormState(prev => ({
                ...prev,
                codigo: novoCodigo,
                internalCode: novoCodigo
            }));
        }
    }, [formState.tipoServico, serviceToEdit]);

    const loadServices = async () => {
        try {
            setLoading(true);
            const response = await servicosService.listar();
            
            if (response.success && response.data) {
                // Mapear serviços da API adicionando aliases para compatibilidade
                const servicosArray = Array.isArray(response.data) ? response.data : [];
                const servicesFormatados = servicosArray.map((serv: any) => ({
                    ...serv,
                    // Aliases para compatibilidade com o código existente
                    name: serv.nome,
                    internalCode: serv.codigo,
                    description: serv.descricao || '',
                    type: serv.tipo,
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
            .filter(s => typeFilter === 'Todos' || s.type === typeFilter || s.tipo === typeFilter)
            .filter(s => {
                // Filtro por tipo de serviço (classificação)
                if (tipoServicoFilter === 'TODOS') return true;
                if (tipoServicoFilter === 'ENGENHARIA_PROJETOS') {
                    const tipoServico = (s as any).tipoServico;
                    return tipoServico === 'ENGENHARIA' || tipoServico === 'PROJETOS';
                }
                const tipoServico = (s as any).tipoServico;
                return tipoServico === tipoServicoFilter;
            })
            .filter(s =>
                (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.internalCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.description || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [services, searchTerm, typeFilter, tipoServicoFilter]);

    // Estatísticas calculadas
    const stats = useMemo(() => {
        const total = services.length;
        const ativos = services.filter(s => (s.price || 0) > 0).length; // Considera ativo se tem preço
        const inativos = total - ativos;
        const precoMedio = total > 0 ? services.reduce((sum, s) => sum + (s.price || s.preco || 0), 0) / total : 0;
        
        return { total, ativos, inativos, precoMedio };
    }, [services]);

    const resetForm = () => {
        setFormState({ 
            nome: '',
            codigo: '',
            descricao: '',
            tipo: ServiceType.Instalacao,
            tipoServico: 'MAO_DE_OBRA',
            name: '', 
            internalCode: '', 
            description: '', 
            type: ServiceType.Instalacao, 
            price: '', 
            unidade: 'un' 
        });
    };

    const handleOpenModal = (service: Service | null = null) => {
        if (service) {
            setServiceToEdit(service);
            const name = (service as any).name || service.nome || '';
            const internalCode = (service as any).internalCode || service.codigo || '';
            const description = (service as any).description || service.descricao || '';
            const type = (service as any).type || service.tipo || ServiceType.Instalacao;
            const price = String((service as any).price || service.preco || 0);
            const unidade = service.unidade || 'un';
            
            setFormState({ 
                nome: service.nome || '',
                codigo: service.codigo || '',
                descricao: service.descricao || '',
                tipo: service.tipo || ServiceType.Instalacao,
                tipoServico: (service as any).tipoServico || 'MAO_DE_OBRA', // ✅ NOVO: Tipo de serviço
                name,
                internalCode,
                description,
                type,
                price,
                unidade
            });
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
        
        // Se mudou o tipoServico e não está editando, gerar código automaticamente
        if (name === 'tipoServico' && !serviceToEdit) {
            const novoCodigo = gerarProximoCodigo(services, value as TipoServicoClassificacao);
            setFormState(prev => ({ 
                ...prev, 
                [name]: value,
                codigo: novoCodigo,
                internalCode: novoCodigo
            }));
        } else {
            setFormState(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validações detalhadas
        if (!formState.name || formState.name.trim() === '') {
            toast.error('Nome do serviço é obrigatório');
            return;
        }
        
        if (!formState.internalCode || formState.internalCode.trim() === '') {
            toast.error('Código interno é obrigatório');
            return;
        }
        
        if (!formState.type) {
            toast.error('Tipo do serviço é obrigatório');
            return;
        }
        
        const priceValue = parseFloat(formState.price);
        if (isNaN(priceValue) || priceValue < 0) {
            toast.error('O preço deve ser um número válido e positivo');
            return;
        }

        try {
            if (serviceToEdit) {
                // Atualizar serviço existente
                const servicoData = {
                    nome: formState.name.trim(),
                    codigo: formState.internalCode.trim(),
                    descricao: formState.description?.trim() || '',
                    tipo: formState.type,
                    tipoServico: formState.tipoServico, // ✅ NOVO: Tipo de serviço
                    preco: priceValue,
                    unidade: formState.unidade || 'un'
                };
                
                console.log('📤 Atualizando serviço:', servicoData);
                
                const response = await servicosService.atualizar(serviceToEdit.id, servicoData);
                
                if (response.success) {
                    toast.success('Serviço atualizado com sucesso!');
                    handleCloseModal();
                    await loadServices();
                } else {
                    const errorMsg = response.error || (response as any).message || 'Erro desconhecido';
                    toast.error(`Erro ao atualizar: ${errorMsg}`);
                }
            } else {
                // Criar novo serviço
                const servicoData = {
                    nome: formState.name.trim(),
                    codigo: formState.internalCode.trim(),
                    descricao: formState.description?.trim() || '',
                    tipo: formState.type,
                    tipoServico: formState.tipoServico, // ✅ NOVO: Tipo de serviço
                    preco: priceValue,
                    unidade: formState.unidade || 'un'
                };
                
                console.log('📤 Criando novo serviço:', servicoData);
                
                const response = await servicosService.criar(servicoData);
                
                if (response.success) {
                    toast.success('Serviço criado com sucesso!');
                    handleCloseModal();
                    await loadServices();
                } else {
                    const errorMsg = response.error || (response as any).message || 'Erro desconhecido';
                    toast.error(`Erro ao criar: ${errorMsg}`);
                    console.error('❌ Resposta do servidor:', response);
                }
            }
        } catch (error: any) {
            console.error('❌ Erro ao salvar serviço:', error);
            const errorMsg = error?.response?.data?.message || error?.message || 'Erro desconhecido';
            toast.error(`Erro: ${errorMsg}`);
        }
    };

    // ✅ FUNÇÕES DE IMPORTAÇÃO/EXPORTAÇÃO
    const handleDownloadTemplate = () => {
        const template = generateEmptyTemplate();
        downloadJSON(template, 'template-servicos-s3e.json');
        toast.success('Template baixado!', {
            description: 'Preencha o arquivo JSON e importe de volta'
        });
    };

    const handleDownloadEmptyTemplate = () => {
        const template = generateEmptyTemplate();
        downloadJSON(template, 'template-servicos-s3e.json');
        toast.success('Template baixado!', {
            description: 'Preencha o arquivo JSON e importe de volta'
        });
    };

    const handleDownloadExampleTemplate = () => {
        const template = generateExampleTemplate();
        downloadJSON(template, 'servicos-template-exemplo.json');
        toast.success('Template com exemplos baixado!', {
            description: '10 serviços de exemplo incluídos'
        });
    };

    const handleExportServicos = async () => {
        try {
            const response = await servicosService.exportarJSON();
            if (response.success && response.data) {
                const exportData = response.data as ServicosImportData;
                downloadJSON(exportData, `servicos-export-${new Date().toISOString().split('T')[0]}.json`);
                toast.success('Serviços exportados!', {
                    description: `${exportData.servicos.length} serviços exportados com sucesso`
                });
            }
        } catch (error) {
            console.error('Erro ao exportar:', error);
            toast.error('Erro ao exportar serviços');
        }
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const data = await readJSONFile(file);
            const validation = validateImportData(data);

            if (!validation.valid) {
                toast.error('Arquivo JSON inválido', {
                    description: validation.errors.join(', ')
                });
                return;
            }

            // Preparar dados para preview
            const previewData = data.servicos.map((serv: any) => ({
                codigo: serv.codigo || 'N/A',
                nome: serv.nome || 'N/A',
                tipoServico: serv.tipoServico || 'MAO_DE_OBRA',
                preco: serv.preco || 0,
                unidade: serv.unidade || 'un',
                descricao: serv.descricao || ''
            }));

            // Mostrar preview antes de importar
            setImportPreviewData(previewData);
            setShowImportPreview(true);
        } catch (error: any) {
            console.error('Erro ao ler arquivo:', error);
            toast.error('Erro ao ler arquivo', {
                description: error.message || 'Verifique o formato do arquivo'
            });
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleConfirmImport = async () => {
        setIsImporting(true);
        try {
            const response = await servicosService.importarJSON(importPreviewData);

            if (response.success && response.data) {
                const importData = response.data as ImportResult;
                setImportResult(importData);
                setShowImportModal(true);
                setShowImportPreview(false);
                loadServices(); // Recarregar lista
                
                toast.success('Importação concluída!', {
                    description: `${importData.sucesso} serviços importados, ${importData.erros} erros`
                });
            }
        } catch (error: any) {
            console.error('Erro ao importar:', error);
            toast.error('Erro ao importar serviços', {
                description: error.message || 'Verifique o formato do arquivo'
            });
        } finally {
            setIsImporting(false);
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
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Input oculto para importação */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isImporting}
                    />
                    
                    {/* Dropdown de Ações */}
                    <ActionsDropdown
                        actions={[
                            {
                                label: 'Baixar Template JSON',
                                onClick: handleDownloadTemplate,
                                icon: <DocumentTextIcon className="w-4 h-4" />,
                                variant: 'primary'
                            },
                            {
                                label: 'Template com Exemplos',
                                onClick: handleDownloadExampleTemplate,
                                icon: <DocumentTextIcon className="w-4 h-4" />,
                                variant: 'default'
                            },
                            {
                                label: 'Exportar JSON',
                                onClick: handleExportServicos,
                                icon: <ArrowDownTrayIcon className="w-4 h-4" />,
                                variant: 'success'
                            },
                            {
                                label: isImporting ? 'Importando...' : 'Importar JSON',
                                onClick: () => fileInputRef.current?.click(),
                                icon: <ArrowUpTrayIcon className="w-4 h-4" />,
                                disabled: isImporting,
                                variant: 'primary'
                            }
                        ]}
                        label="Ações"
                    />
                    
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-600 transition-all shadow-lg font-semibold"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Novo Serviço
                    </button>
                </div>
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

            {/* Botões de Classificação e Visualização */}
            {viewModeClassificacao === 'separada' && (
                <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Classificação de Serviços</h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setViewModeClassificacao('completa')}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                                <ListBulletIcon className="w-5 h-5" />
                                Visualização Completa
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setTipoServicoFilter('TODOS')}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                                tipoServicoFilter === 'TODOS'
                                    ? 'bg-gradient-to-r from-gray-600 to-gray-500 text-white shadow-lg'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setTipoServicoFilter('MAO_DE_OBRA')}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                                tipoServicoFilter === 'MAO_DE_OBRA'
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                        >
                            🔧 {formatTipoServicoNome('MAO_DE_OBRA')}
                            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                                {services.filter(s => (s as any).tipoServico === 'MAO_DE_OBRA').length}
                            </span>
                        </button>
                        <button
                            onClick={() => setTipoServicoFilter('MONTAGEM')}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                                tipoServicoFilter === 'MONTAGEM'
                                    ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                        >
                            ⚙️ {formatTipoServicoNome('MONTAGEM')}
                            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                                {services.filter(s => (s as any).tipoServico === 'MONTAGEM').length}
                            </span>
                        </button>
                        <button
                            onClick={() => setTipoServicoFilter('ENGENHARIA_PROJETOS')}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                                tipoServicoFilter === 'ENGENHARIA_PROJETOS'
                                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
                                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            }`}
                        >
                            📐 Engenharia / Projetos
                            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                                {services.filter(s => {
                                    const tipo = (s as any).tipoServico;
                                    return tipo === 'ENGENHARIA' || tipo === 'PROJETOS';
                                }).length}
                            </span>
                        </button>
                        <button
                            onClick={() => setTipoServicoFilter('ADMINISTRATIVO')}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                                tipoServicoFilter === 'ADMINISTRATIVO'
                                    ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg'
                                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            }`}
                        >
                            📋 {formatTipoServicoNome('ADMINISTRATIVO')}
                            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                                {services.filter(s => (s as any).tipoServico === 'ADMINISTRATIVO').length}
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {/* Filtros e Toggle de Visualização */}
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
                    <div className="flex items-center gap-2">
                        {viewModeClassificacao === 'completa' && (
                            <button
                                onClick={() => setViewModeClassificacao('separada')}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                                <Squares2X2Icon className="w-5 h-5" />
                                Visualização Separada
                            </button>
                        )}
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                                viewMode === 'grid'
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <Squares2X2Icon className="w-5 h-5" />
                            Grade
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                                viewMode === 'list'
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <ListBulletIcon className="w-5 h-5" />
                            Lista
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

            {/* Lista/Grid de Serviços */}
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
            ) : viewMode === 'list' ? (
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">SERVIÇO</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">CÓDIGO</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">TIPO</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">DESCRIÇÃO</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">PREÇO</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">UNIDADE</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">STATUS</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredServices.map((service) => (
                                    <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center flex-shrink-0">
                                                    <WrenchScrewdriverIcon className="w-5 h-5 text-cyan-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{service.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-600 font-mono">{service.internalCode}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg ${getTypeClass(service.type || service.tipo || ServiceType.Instalacao)}`}>
                                                {getTypeIcon(service.type || service.tipo || ServiceType.Instalacao)} {service.type || service.tipo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-600 line-clamp-2 max-w-xs">{service.description || service.descricao || 'Sem descrição'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-lg font-bold text-green-600">
                                                R$ {(service.price || service.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm text-gray-600">{service.unidade || 'un'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <span className="inline-flex items-center px-3 py-1 text-xs font-bold rounded-lg bg-green-100 text-green-800 ring-1 ring-green-200">
                                                    ✅ Ativo
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => setServiceToView(service)}
                                                    className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                                    title="Visualizar"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenModal(service)}
                                                    className="p-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition-colors"
                                                    title="Editar"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenDeleteModal(service)}
                                                    className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                                    title="Desativar"
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
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredServices.map((service) => (
                        <div key={service.id} className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-200 hover:border-cyan-300">
                            {/* Header do Card */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{service.name || service.nome}</h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${getTypeClass(service.type || service.tipo || ServiceType.Instalacao)}`}>
                                            {getTypeIcon(service.type || service.tipo || ServiceType.Instalacao)} {service.type || service.tipo}
                                        </span>
                                        {(service as any).tipoServico && (() => {
                                            const style = getTipoServicoStyle((service as any).tipoServico);
                                            return (
                                                <span className={`px-3 py-1 text-xs font-bold rounded-lg ${style.bg} ${style.text} ${style.ring}`}>
                                                    {style.icon} {formatTipoServicoNome((service as any).tipoServico)}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <span className="px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm bg-green-100 text-green-800 ring-1 ring-green-200">
                                    ✅ Ativo
                                </span>
                            </div>

                            {/* Informações */}
                            <div className="space-y-2 mb-4">
                                <div className="text-sm text-gray-600">
                                    <p className="line-clamp-2">{service.description || service.descricao || 'Sem descrição'}</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <FolderIcon className="w-4 h-4" />
                                    <span className="truncate">{service.type || service.tipo}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <ClockIcon className="w-4 h-4" />
                                    <span>Código: {service.internalCode || service.codigo}</span>
                                </div>
                            </div>

                            {/* Preço */}
                            <div className="bg-cyan-50 border border-cyan-200 p-3 rounded-xl mb-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-cyan-800">Preço:</span>
                                    <div className="text-right">
                                        <span className="text-xl font-bold text-cyan-700">
                                            R$ {(service.price || service.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                        <p className="text-xs text-cyan-600">/{service.unidade || 'un'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => setServiceToView(service)}
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
                                        Tipo de Serviço *
                                    </label>
                                    <select
                                        name="type"
                                        value={formState.type}
                                        onChange={handleInputChange}
                                        className="select-field"
                                        required
                                    >
                                        {Object.values(ServiceType).map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Classificação do Serviço *
                                    </label>
                                    <select
                                        name="tipoServico"
                                        value={formState.tipoServico}
                                        onChange={(e) => setFormState({...formState, tipoServico: e.target.value as any})}
                                        className="select-field"
                                        required
                                    >
                                        <option value="MAO_DE_OBRA">Mão de Obra</option>
                                        <option value="MONTAGEM">Montagem</option>
                                        <option value="ENGENHARIA">Engenharia</option>
                                        <option value="PROJETOS">Projetos</option>
                                        <option value="ADMINISTRATIVO">Administrativo</option>
                                    </select>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Selecione a classificação do serviço para métricas no BI
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                        Unidade de Medida *
                                    </label>
                                    <select
                                        name="unidade"
                                        value={formState.unidade}
                                        onChange={(e) => setFormState({...formState, unidade: e.target.value})}
                                        className="select-field"
                                        required
                                    >
                                        <option value="un">Unidade (un)</option>
                                        <option value="m²">Metro Quadrado (m²)</option>
                                        <option value="m³">Metro Cúbico (m³)</option>
                                        <option value="m">Metro Linear (m)</option>
                                        <option value="diaria">Diária</option>
                                        <option value="hora">Hora</option>
                                        <option value="kg">Quilograma (kg)</option>
                                    </select>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Escolha como este serviço será cobrado (ex: m² para instalação elétrica)
                                    </p>
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
            
            {/* MODAL DE VISUALIZAÇÃO */}
            {serviceToView && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-cyan-50">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Detalhes do Serviço</h2>
                                <p className="text-sm text-gray-600 mt-1">Informações completas do serviço</p>
                            </div>
                            <button onClick={() => setServiceToView(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-xl">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 mb-2">Nome</h3>
                                    <p className="text-gray-900 font-medium">{serviceToView.name || serviceToView.nome}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 mb-2">Tipo</h3>
                                    <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${getTypeClass(serviceToView.type || serviceToView.tipo || ServiceType.Instalacao)}`}>
                                        {getTypeIcon(serviceToView.type || serviceToView.tipo || ServiceType.Instalacao)} {serviceToView.type || serviceToView.tipo}
                                    </span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 mb-2">Código</h3>
                                    <p className="text-gray-900 font-medium">{serviceToView.internalCode || serviceToView.codigo}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 mb-2">Status</h3>
                                    <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-100 text-green-800 ring-1 ring-green-200">
                                        ✅ Ativo
                                    </span>
                                </div>
                            </div>

                            <div className="bg-cyan-50 border border-cyan-200 p-4 rounded-xl">
                                <h3 className="font-semibold text-gray-800 mb-2">Descrição</h3>
                                <p className="text-gray-700">{serviceToView.description || serviceToView.descricao || 'Sem descrição'}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 mb-2">Preço</h3>
                                    <p className="text-2xl font-bold text-green-700">
                                        R$ {(serviceToView.price || serviceToView.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-sm text-green-600">/{serviceToView.unidade || 'un'}</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                                    <h3 className="font-semibold text-gray-800 mb-2">Unidade de Medida</h3>
                                    <p className="text-2xl font-bold text-blue-700">{serviceToView.unidade || 'un'}</p>
                                </div>
                            </div>
                        </div>
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

            {/* ✅ MODAL DE PREVIEW DA IMPORTAÇÃO */}
            {showImportPreview && importPreviewData.length > 0 && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                                        <EyeIcon className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Preview da Importação</h2>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {importPreviewData.length} serviço(s) serão importados
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowImportPreview(false);
                                        setImportPreviewData([]);
                                    }}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Lista de Serviços */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-3">
                                {importPreviewData.map((servico, index) => {
                                    const style = getTipoServicoStyle(servico.tipoServico);
                                    return (
                                        <div
                                            key={index}
                                            className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-all"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div className="md:col-span-2">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg ${style.bg} ${style.text} ${style.ring}`}>
                                                            {style.icon} {formatTipoServicoNome(servico.tipoServico)}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-bold text-gray-900 mb-1">{servico.nome}</h3>
                                                    <p className="text-sm text-gray-600">{servico.descricao || 'Sem descrição'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">Código</p>
                                                    <p className="font-mono font-semibold text-gray-900">{servico.codigo}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">Valor / Unidade</p>
                                                    <p className="font-bold text-green-600">
                                                        R$ {servico.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </p>
                                                    <p className="text-xs text-gray-500">/{servico.unidade}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowImportPreview(false);
                                    setImportPreviewData([]);
                                }}
                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmImport}
                                disabled={isImporting}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isImporting ? 'Importando...' : 'Confirmar Importação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ MODAL DE RESULTADO DA IMPORTAÇÃO */}
            {showImportModal && importResult && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-lg">
                                        <DocumentTextIcon className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Resultado da Importação</h2>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {importResult.sucesso} sucesso • {importResult.erros} erros • {importResult.total} total
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Estatísticas */}
                        <div className="p-6 bg-gray-50 border-b border-gray-200">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white rounded-xl p-4 border-2 border-green-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                            <span className="text-xl">✅</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Sucesso</p>
                                            <p className="text-2xl font-bold text-green-600">{importResult.sucesso}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl p-4 border-2 border-red-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                            <span className="text-xl">❌</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Erros</p>
                                            <p className="text-2xl font-bold text-red-600">{importResult.erros}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl p-4 border-2 border-blue-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <span className="text-xl">📊</span>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Total</p>
                                            <p className="text-2xl font-bold text-blue-600">{importResult.total}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detalhes */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Detalhes da Importação</h3>
                            <div className="space-y-2">
                                {importResult.detalhes.map((detalhe, index) => (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-lg border-2 ${
                                            detalhe.status === 'sucesso'
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-red-50 border-red-200'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-xl">
                                                {detalhe.status === 'sucesso' ? '✅' : '❌'}
                                            </span>
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-900">
                                                    Linha {detalhe.linha}: {detalhe.nome}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    Código: {detalhe.codigo}
                                                </p>
                                                {detalhe.mensagem && (
                                                    <p className={`text-sm mt-1 ${
                                                        detalhe.status === 'sucesso' ? 'text-green-700' : 'text-red-700'
                                                    }`}>
                                                        {detalhe.mensagem}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 font-semibold transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Servicos;
