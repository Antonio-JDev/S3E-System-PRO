import React, { useState, useMemo, useEffect, useContext, useRef } from 'react';
import { toast } from 'sonner';
import { clientesService, type Cliente } from '../services/clientesService';
import { AuthContext } from '../contexts/AuthContext';
import { canDelete } from '../utils/permissions';
import AlertDialog from './ui/AlertDialog';
import ActionsDropdown from './ui/ActionsDropdown';
import ViewToggle from './ui/ViewToggle';
import { loadViewMode, saveViewMode } from '../utils/viewModeStorage';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { 
    generateEmptyTemplate, 
    generateExampleTemplate, 
    exportToJSON, 
    readJSONFile, 
    validateImportData, 
    downloadJSON,
    type ClientesImportData,
    type ImportResult
} from '../utils/clientesImportExport';
import { axiosApiService } from '../services/axiosApi';
import { ENDPOINTS } from '../config/api';
import ClienteCreateEditModal from './ui/ClienteCreateEditModal';

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
const ArrowDownTrayIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);
const ArrowUpTrayIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);
const DocumentTextIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);
const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const GlobeAltIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
);
const PhoneIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
);
const UserGroupIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
);
const CogIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const ClipboardDocumentListIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
);
const ScaleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.4-4.037 1.125M12 21c1.471 0 2.882-.4 4.037-1.125M3 12h.75m15 0h.75M3 15h6m12 0h.75M3 18h.75M12 3v.75M12 18v.75" />
    </svg>
);
const InformationCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
);

interface ClientesProps {
    toggleSidebar: () => void;
    initialClientId?: string | null;
    onClearInitialClientId?: () => void;
}

const ClientesModerno: React.FC<ClientesProps> = ({ toggleSidebar, initialClientId, onClearInitialClientId }) => {
    const { user } = useContext(AuthContext)!;

    /** Converte valor da API (string ou objeto { id, descricao }) para string segura para React */
    const toDisplayValue = (val: unknown): string => {
        if (val == null) return '—';
        if (typeof val === 'string') return val.trim() || '—';
        if (typeof val === 'number') return String(val);
        if (typeof val === 'object' && val !== null && 'descricao' in val) return String((val as { descricao?: string }).descricao ?? '—');
        if (typeof val === 'object' && val !== null && 'nome' in val) return String((val as { nome?: string }).nome ?? '—');
        if (typeof val === 'object' && val !== null && 'id' in val) {
            const o = val as { id?: string | number; descricao?: string };
            return [o.id, o.descricao].filter(Boolean).join(' - ') || '—';
        }
        return String(val);
    };
    
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFilter, setTipoFilter] = useState<'Todos' | 'PF' | 'PJ'>('Todos');
    const [ativoFilter, setAtivoFilter] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => loadViewMode('clientes'));

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clienteToEdit, setClienteToEdit] = useState<Cliente | null>(null);
    const [clienteToView, setClienteToView] = useState<Cliente | null>(null);
    const [viewCnpjData, setViewCnpjData] = useState<any | null>(null);
    const [viewCnpjLoading, setViewCnpjLoading] = useState(false);
    /** Timestamps das buscas CNPJ.ws no modal de visualização (último minuto, máx. 3) */
    const [cnpjViewRequestsAt, setCnpjViewRequestsAt] = useState<number[]>([]);
    const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePermanent, setDeletePermanent] = useState(false); // true = permanente, false = soft delete

    // Estados para importação/exportação
    const [importing, setImporting] = useState(false);
    const [modalPreviewImportOpen, setModalPreviewImportOpen] = useState(false);
    const [dadosParaImportar, setDadosParaImportar] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // O formulário de criação/edição foi extraído para um componente reutilizável

    useEffect(() => {
        loadClientes();
    }, []);

    // Abrir modal "Ver dados do cliente" quando vier pelo link rápido (ordem de serviço)
    useEffect(() => {
        if (!initialClientId || !onClearInitialClientId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await clientesService.buscar(initialClientId);
                if (cancelled) return;
                if (res.success && res.data) {
                    await openViewModal(res.data);
                } else {
                    toast.error(res.error || 'Cliente não encontrado');
                }
            } catch (e) {
                if (!cancelled) toast.error('Cliente não encontrado');
            } finally {
                if (!cancelled) onClearInitialClientId();
            }
        })();
        return () => { cancelled = true; };
    }, [initialClientId, onClearInitialClientId]);

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

    const handleViewModeChange = (newView: 'grid' | 'list') => {
        setViewMode(newView);
        saveViewMode('clientes', newView);
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
        } else {
            setClienteToEdit(null);
        }
        setIsModalOpen(true);
    };

    // Abrir modal de visualização — exibe dados do banco (incl. JSON CNPJ.ws salvo); API só ao clicar em "Atualizar Dados/IE"
    const openViewModal = (cliente: Cliente | null) => {
        if (!cliente) {
            setClienteToView(null);
            setViewCnpjData(null);
            return;
        }
        setClienteToView(cliente);
        setViewCnpjData(cliente.dadosCnpjWs && typeof cliente.dadosCnpjWs === 'object' ? (cliente.dadosCnpjWs as any) : null);
        setViewCnpjLoading(false);
    };

    const closeViewModal = () => {
        setClienteToView(null);
        setViewCnpjData(null);
        setViewCnpjLoading(false);
    };

    const CNPJ_VIEW_LIMIT = 3;
    const CNPJ_VIEW_WINDOW_MS = 60_000;

    const handleAtualizarDadosView = async () => {
        if (!clienteToView) return;
        const raw = (clienteToView.cpfCnpj || '').replace(/\D/g, '');
        if (raw.length !== 14) {
            toast.error('CNPJ inválido para busca (14 dígitos).');
            return;
        }
        const now = Date.now();
        const inLastMinute = cnpjViewRequestsAt.filter((t) => now - t < CNPJ_VIEW_WINDOW_MS);
        if (inLastMinute.length >= CNPJ_VIEW_LIMIT) {
            toast.warning('Limite de buscas atingido. Aguarde 1 minuto.');
            return;
        }
        setCnpjViewRequestsAt((prev) => [...prev.filter((t) => now - t < CNPJ_VIEW_WINDOW_MS), now]);
        const toastId = toast.loading('Buscando dados...');
        setViewCnpjLoading(true);
        try {
            const result = await clientesService.consultarCnpj(raw);
            toast.dismiss(toastId);
            setViewCnpjLoading(false);
            if (result.success && result.data) {
                setViewCnpjData(result.data.raw ?? result.data);
                const restantes = CNPJ_VIEW_LIMIT - inLastMinute.length - 1;
                const d = result.data as {
                    razaoSocial?: string;
                    nomeFantasia?: string;
                    email?: string;
                    telefone?: string;
                    logradouro?: string;
                    numero?: string;
                    bairro?: string;
                    cidade?: string;
                    estado?: string;
                    cep?: string;
                    inscricaoEstadual?: string;
                    indIEDest?: number;
                };
                const rawFromApi = (result.data as { raw?: unknown }).raw ?? result.data;
                const updatePayload = {
                    ...clienteToView,
                    nome: (d.razaoSocial ?? d.nomeFantasia ?? clienteToView.nome).trim() || clienteToView.nome,
                    email: d.email ?? clienteToView.email,
                    telefone: d.telefone ?? clienteToView.telefone,
                    endereco: d.logradouro ?? clienteToView.endereco,
                    numero: d.numero ?? clienteToView.numero,
                    bairro: d.bairro ?? clienteToView.bairro,
                    cidade: d.cidade ?? clienteToView.cidade,
                    estado: d.estado ?? clienteToView.estado,
                    cep: d.cep ?? clienteToView.cep,
                    inscricaoEstadual: d.inscricaoEstadual ?? clienteToView.inscricaoEstadual,
                    indIEDest: d.indIEDest ?? clienteToView.indIEDest,
                    dadosCnpjWs: rawFromApi,
                };
                const upd = await clientesService.atualizar(clienteToView.id, updatePayload);
                if (upd.success && upd.data) {
                    setClienteToView(upd.data);
                    await loadClientes();
                    toast.success(`Dados salvos no cadastro (NF-e/NFS-e). ${CNPJ_VIEW_LIMIT} buscas/min - ${restantes} restante(s).`);
                } else {
                    toast.warning('Dados exibidos, mas falha ao salvar. Tente editar o cliente manualmente.');
                }
            } else {
                toast.error(result.error || 'Erro ao consultar CNPJ.');
            }
        } catch (err) {
            toast.dismiss(toastId);
            setViewCnpjLoading(false);
            toast.error('Erro ao consultar CNPJ: ' + (err instanceof Error ? err.message : 'erro de conexão'));
        }
    };

    const handleClienteSalvo = async (cliente: Cliente) => {
        await loadClientes();
        setIsModalOpen(false);
        toast.success(`Cliente ${clienteToEdit ? 'atualizado' : 'criado'}!`, {
            description: clienteToEdit ? 'Alterações salvas' : 'Novo cliente cadastrado'
        });
        // Se criou novo cliente, garantir que o objeto retornado possa ser usado por quem chamou o modal no futuro
        // (mantemos apenas o fluxo local aqui)
        return cliente;
    };


    // Funções de Importação/Exportação
    const handleExportTemplate = async () => {
        try {
            const template = generateExampleTemplate();
            downloadJSON(template, `template-clientes-exemplo-${new Date().toISOString().split('T')[0]}.json`);
            toast.success('✅ Template baixado com sucesso!');
        } catch (error) {
            console.error('Erro ao exportar template:', error);
            toast.error('❌ Erro ao exportar template');
        }
    };

    const handleExportData = async () => {
        try {
            const clientesExport = clientes.map(c => ({
                nome: c.nome,
                cpfCnpj: c.cpfCnpj,
                email: c.email || '',
                telefone: c.telefone || '',
                endereco: c.endereco || '',
                cidade: c.cidade || '',
                estado: c.estado || '',
                cep: c.cep || '',
                tipo: c.tipo || 'PJ',
                ativo: c.ativo !== false
            }));
            const exportData = exportToJSON(clientesExport);
            downloadJSON(exportData, `clientes-export-${new Date().toISOString().split('T')[0]}.json`);
            toast.success(`✅ ${clientes.length} cliente(s) exportado(s) com sucesso!`);
        } catch (error) {
            console.error('Erro ao exportar clientes:', error);
            toast.error('❌ Erro ao exportar clientes');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setImporting(true);
            const data = await readJSONFile(file);
            
            // Validar estrutura
            const validation = validateImportData(data);
            if (!validation.valid) {
                toast.error('❌ Erro na validação: ' + validation.errors.join(', '));
                return;
            }

            if (!data.clientes || data.clientes.length === 0) {
                toast.error('❌ O arquivo não contém clientes para importar');
                return;
            }

            // Fazer preview da importação via API
            const formData = new FormData();
            formData.append('file', file);

            const previewResponse = await axiosApiService.post(`${ENDPOINTS.CLIENTES}/import/preview`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (previewResponse.success && previewResponse.data) {
                setDadosParaImportar(previewResponse.data);
                setModalPreviewImportOpen(true);
            } else {
                toast.error('❌ Erro ao processar arquivo: ' + (previewResponse.error || 'Erro desconhecido'));
            }
        } catch (error: any) {
            console.error('Erro ao importar:', error);
            toast.error('❌ Erro ao processar arquivo', {
                description: error.message || 'Erro desconhecido'
            });
        } finally {
            setImporting(false);
            // Limpar input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleConfirmarImportacao = async () => {
        if (!dadosParaImportar) return;

        try {
            setImporting(true);
            
            const response = await axiosApiService.post(`${ENDPOINTS.CLIENTES}/import`, {
                clientes: dadosParaImportar.clientes
            });

            if (response.success && response.data) {
                const criados = (response.data as any).criados || 0;
                const atualizados = (response.data as any).atualizados || 0;
                const erros = (response.data as any).erros || 0;
                
                toast.success('✅ Importação concluída!', {
                    description: `${criados} criados, ${atualizados} atualizados, ${erros} erros`
                });

                // Recarregar clientes
                await loadClientes();
                setModalPreviewImportOpen(false);
                setDadosParaImportar(null);
            } else {
                toast.error('❌ Erro na importação: ' + (response.error || 'Erro desconhecido'));
            }
        } catch (error: any) {
            console.error('Erro ao confirmar importação:', error);
            toast.error('❌ Erro ao importar clientes', {
                description: error.message || 'Erro desconhecido'
            });
        } finally {
            setImporting(false);
        }
    };

    // Fechar modais com ESC
    useEscapeKey(isModalOpen, () => setIsModalOpen(false));
    useEscapeKey(!!clienteToView, () => setClienteToView(null));
    useEscapeKey(!!clienteToDelete, () => setClienteToDelete(null));
    useEscapeKey(modalPreviewImportOpen, () => setModalPreviewImportOpen(false));

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
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center bg-white dark:bg-dark-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando clientes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-white dark:bg-dark-bg">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-dark-text-secondary rounded-xl hover:bg-gray-100 dark:hover:bg-dark-card hover:shadow-soft">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Clientes</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Gerencie seus clientes e parceiros</p>
                    </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                    {/* Input oculto para importação */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImportFile}
                        className="hidden"
                    />
                    
                    {/* Dropdown de Ações */}
                    <ActionsDropdown
                        actions={[
                            {
                                label: loading ? 'Carregando...' : 'Atualizar',
                                onClick: loadClientes,
                                icon: <ArrowPathIcon className="w-4 h-4" />,
                                disabled: loading,
                                variant: 'default'
                            },
                            {
                                label: 'Template Vazio',
                                onClick: () => {
                                    const template = generateEmptyTemplate();
                                    downloadJSON(template, 'clientes-template-vazio.json');
                                    toast.success('Template vazio baixado!');
                                },
                                icon: <DocumentTextIcon className="w-4 h-4" />,
                                variant: 'default'
                            },
                            {
                                label: 'Template com Exemplos',
                                onClick: handleExportTemplate,
                                icon: <DocumentTextIcon className="w-4 h-4" />,
                                variant: 'primary'
                            },
                            {
                                label: 'Exportar JSON',
                                onClick: handleExportData,
                                icon: <ArrowDownTrayIcon className="w-4 h-4" />,
                                disabled: clientes.length === 0,
                                variant: 'success'
                            },
                            {
                                label: importing ? 'Importando...' : 'Importar JSON',
                                onClick: handleImportClick,
                                icon: <ArrowUpTrayIcon className="w-4 h-4" />,
                                disabled: importing,
                                variant: 'primary'
                            }
                        ]}
                        label="Ações"
                    />
                    
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Novo Cliente
                    </button>
                </div>
            </header>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <p className="text-red-800 dark:text-red-300 font-medium">⚠️ {error}</p>
                        <button 
                            onClick={loadClientes}
                            className="text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 font-medium underline"
                        >
                            Tentar novamente
                        </button>
                    </div>
                </div>
            )}

            {/* Filtros */}
            <div className="card-primary mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-dark-text-secondary" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, CPF/CNPJ ou email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-field pl-10"
                            />
                        </div>
                    </div>

                    <div>
                        <select
                            value={tipoFilter}
                            onChange={(e) => setTipoFilter(e.target.value as any)}
                            className="select-field"
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
                            className="select-field"
                        >
                            <option value="Todos">Todos os Status</option>
                            <option value="Ativo">Ativos</option>
                            <option value="Inativo">Inativos</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                        Exibindo <span className="font-bold text-gray-900 dark:text-dark-text">{filteredClientes.length}</span> de <span className="font-bold text-gray-900 dark:text-dark-text">{clientes.length}</span> clientes
                    </p>
                    <div className="flex items-center gap-4">
                        <ViewToggle view={viewMode} onViewChange={handleViewModeChange} />
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-gray-600 dark:text-dark-text-secondary">Ativo: {clientes.filter(c => c.ativo).length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-xs text-gray-600 dark:text-dark-text-secondary">Inativo: {clientes.filter(c => !c.ativo).length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${error ? 'bg-red-500' : clientes.length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                            <span className="text-xs text-gray-600 dark:text-dark-text-secondary">
                                {error ? 'API Error' : clientes.length > 0 ? 'API Online' : 'Carregando...'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid/Lista de Clientes */}
            {filteredClientes.length === 0 ? (
                <div className="card-primary p-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">👥</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">Nenhum cliente encontrado</h3>
                    <p className="text-gray-500 dark:text-dark-text-secondary mb-6">
                        {searchTerm || tipoFilter !== 'Todos' || ativoFilter !== 'Todos'
                            ? 'Tente ajustar os filtros de busca'
                            : 'Comece adicionando seu primeiro cliente'}
                    </p>
                    {!searchTerm && tipoFilter === 'Todos' && ativoFilter === 'Todos' && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-medium font-semibold"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Adicionar Primeiro Cliente
                        </button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                /* Visualização em Grid (Cards) */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClientes.map((cliente) => (
                        <div key={cliente.id} className={`card-primary border-2 transition-all duration-200 ${
                            cliente.ativo ? 'border-gray-200 dark:border-dark-border hover:border-blue-300 dark:hover:border-blue-600' : 'border-red-200 dark:border-red-800 opacity-75'
                        }`}>
                            {/* Header do Card */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-dark-text mb-1">{cliente.nome}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className={cliente.tipo === 'PF' ? 'badge-type bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800' : 'badge-type'}>
                                            {cliente.tipo === 'PF' ? '👤 Pessoa Física' : '🏢 Pessoa Jurídica'}
                                        </span>
                                    </div>
                                </div>
                                <span className={cliente.ativo ? 'badge-status-active' : 'badge-status-inactive'}>
                                    {cliente.ativo ? '✓ Ativo' : '⚠ Inativo'}
                                </span>
                            </div>

                            {/* Informações */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                                    <span className="font-mono text-xs bg-gray-100 dark:bg-dark-card px-2 py-1 rounded text-gray-900 dark:text-dark-text">{cliente.cpfCnpj}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                                    <span>📧</span>
                                    <span className="truncate">{cliente.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                                    <span>📱</span>
                                    <span>{cliente.telefone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                                    <span>📍</span>
                                    <span className="truncate">{cliente.cidade}, {cliente.estado}</span>
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-dark-border">
                                {cliente.ativo ? (
                                    <>
                                        <button
                                            onClick={() => openViewModal(cliente)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors text-sm font-semibold"
                                            title="Ver dados do cliente"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                            Visualizar
                                        </button>
                                        <button
                                            onClick={() => handleOpenModal(cliente)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors text-sm font-semibold"
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
                                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors text-sm font-semibold"
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
                                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors text-sm font-semibold"
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
                                                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors text-sm font-semibold"
                                                title="Desativar cliente"
                                            >
                                                <ArrowPathIcon className="w-4 h-4" />
                                                Desativar
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openViewModal(cliente)}
                                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors text-sm font-semibold"
                                            title="Ver dados do cliente"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                            Visualizar
                                        </button>
                                        <button
                                            onClick={() => handleReativar(cliente)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                                        >
                                            <ArrowPathIcon className="w-5 h-5" />
                                            Reativar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Visualização em Lista (Tabela) */
                <div className="card-primary overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-dark-text-secondary uppercase">Cliente</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-dark-text-secondary uppercase">CPF/CNPJ</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-dark-text-secondary uppercase">Tipo</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-dark-text-secondary uppercase">Contato</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-dark-text-secondary uppercase">Cidade</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-dark-text-secondary uppercase">Status</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-dark-text-secondary uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-dark-bg divide-y divide-gray-200 dark:divide-dark-border">
                            {filteredClientes.map((cliente) => (
                                <tr key={cliente.id} className={`hover:bg-gray-50 dark:hover:bg-dark-card transition-colors ${!cliente.ativo ? 'opacity-60' : ''}`}>
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-gray-900 dark:text-dark-text">{cliente.nome}</p>
                                        {cliente.email && <p className="text-xs text-gray-500 dark:text-dark-text-secondary">{cliente.email}</p>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-dark-text-secondary rounded font-mono">
                                            {cliente.cpfCnpj}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cliente.tipo === 'PF' ? 'badge-type bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'badge-type'}>
                                            {cliente.tipo === 'PF' ? '👤 PF' : '🏢 PJ'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-700 dark:text-dark-text-secondary">{cliente.telefone || '-'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-700 dark:text-dark-text-secondary">{cliente.cidade || '-'}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={cliente.ativo ? 'badge-status-active' : 'badge-status-inactive'}>
                                            {cliente.ativo ? '✅ Ativo' : '❌ Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => openViewModal(cliente)}
                                                className="btn-action-edit p-2 rounded-lg"
                                                title="Visualizar"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleOpenModal(cliente)}
                                                className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
                                                title="Editar"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            {cliente.ativo ? (
                                            <button
                                                onClick={() => {
                                                    setClienteToDelete(cliente);
                                                    setDeletePermanent(false);
                                                    setShowDeleteDialog(true);
                                                }}
                                                className="btn-action-delete p-2 rounded-lg"
                                                title="Desativar"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleReativar(cliente)}
                                                    className="p-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                                    title="Reativar"
                                                >
                                                    <ArrowPathIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ClienteCreateEditModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                clienteToEdit={clienteToEdit}
                onSuccess={(cliente) => {
                    void handleClienteSalvo(cliente);
                }}
            />

            {/* MODAL VER DADOS DO CLIENTE */}
            {clienteToView && (() => {
                const rawCnpj = (clienteToView.cpfCnpj || '').replace(/\D/g, '');
                const isPjWithCnpj = rawCnpj.length === 14;
                const inLastMinute = cnpjViewRequestsAt.filter((t) => Date.now() - t < CNPJ_VIEW_WINDOW_MS);
                const limitReached = inLastMinute.length >= CNPJ_VIEW_LIMIT;
                const canFetchCnpj = isPjWithCnpj && !viewCnpjLoading && !limitReached;
                return (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-in-up">
                        {/* Header compacto */}
                        <div className="relative flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-blue-600 to-blue-700 shrink-0">
                            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                                <EyeIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-4 gap-y-1">
                                <h2 className="text-lg font-bold text-white">Ver dados do cliente</h2>
                                <span className="text-sm text-white/90 truncate">
                                    {(viewCnpjData && (viewCnpjData.razao_social || viewCnpjData.estabelecimento?.nome_fantasia)) || clienteToView.nome}
                                </span>
                                <span className="text-xs text-white/80">
                                    <span className="font-bold">{clienteToView.cpfCnpj}</span>
                                    {viewCnpjData?.estabelecimento?.tipo ? ` · ${viewCnpjData.estabelecimento.tipo}` : ''}
                                    {viewCnpjData?.estabelecimento?.situacao_cadastral ? (
                                        <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/20">
                                            {viewCnpjData.estabelecimento.situacao_cadastral === 'Ativa' ? (
                                                <><span className="w-1 h-1 rounded-full bg-green-300" /> Ativa</>
                                            ) : viewCnpjData.estabelecimento.situacao_cadastral}
                                        </span>
                                    ) : null}
                                </span>
                            </div>
                            {isPjWithCnpj && (
                                <button
                                    type="button"
                                    onClick={handleAtualizarDadosView}
                                    disabled={!canFetchCnpj}
                                    className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/20 text-white hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title={limitReached ? 'Limite de 3 buscas por minuto. Aguarde 1 minuto.' : 'Buscar dados e IE na CNPJ.ws'}
                                >
                                    <ArrowPathIcon className={`w-4 h-4 ${viewCnpjLoading ? 'animate-spin' : ''}`} />
                                    Atualizar Dados/IE
                                </button>
                            )}
                            <button
                                onClick={closeViewModal}
                                className="shrink-0 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                                aria-label="Fechar"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                            {viewCnpjLoading && (
                                <div className="flex items-center justify-center py-8">
                                    <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin" />
                                </div>
                            )}
                            {!viewCnpjLoading && (
                                <>
                                    {/* Sempre layout anexo 2: dados de viewCnpjData (API) ou clienteToView (banco) */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        <section className="bg-gray-50/50 dark:bg-dark-hover/30 rounded-xl p-3 border border-gray-100 dark:border-dark-border">
                                            <div className="flex items-center gap-2 mb-2">
                                                <DocumentTextIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                                <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Dados da Empresa</h3>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                {[
                                                    { label: 'Nome Fantasia', value: viewCnpjData?.estabelecimento?.nome_fantasia ?? viewCnpjData?.razao_social ?? clienteToView.nome },
                                                    { label: 'Porte', value: viewCnpjData?.porte ?? null },
                                                    { label: 'Capital Social', value: viewCnpjData?.capital_social != null ? `R$ ${Number(viewCnpjData.capital_social).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null },
                                                    { label: 'Data Situação', value: viewCnpjData?.estabelecimento?.data_situacao_cadastral ?? null },
                                                    { label: 'Natureza Jurídica', value: viewCnpjData?.natureza_juridica ?? null },
                                                ].map(({ label, value }) => (
                                                    <div key={label} className="flex flex-col gap-0.5">
                                                        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
                                                        <p className="text-sm text-gray-900 dark:text-white font-medium leading-tight">{typeof value === 'string' ? value : toDisplayValue(value)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                        <section className="bg-gray-50/50 dark:bg-dark-hover/30 rounded-xl p-3 border border-gray-100 dark:border-dark-border">
                                            <div className="flex items-center gap-2 mb-2">
                                                <GlobeAltIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                                <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Localização</h3>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                {[
                                                    { label: 'País', value: viewCnpjData?.estabelecimento?.pais ?? 'Brasil' },
                                                    { label: 'Estado', value: viewCnpjData?.estabelecimento?.estado ?? clienteToView.estado },
                                                    { label: 'Cidade', value: viewCnpjData?.estabelecimento?.cidade ?? clienteToView.cidade },
                                                    { label: 'CEP', value: viewCnpjData?.estabelecimento?.cep ?? clienteToView.cep },
                                                    { label: 'Bairro', value: viewCnpjData?.estabelecimento?.bairro ?? clienteToView.bairro },
                                                    { label: 'Logradouro', value: viewCnpjData?.estabelecimento ? [viewCnpjData.estabelecimento.tipo_logradouro, viewCnpjData.estabelecimento.logradouro, viewCnpjData.estabelecimento.numero].filter(Boolean).join(', ') : [clienteToView.endereco, clienteToView.numero].filter(Boolean).join(', ') },
                                                    { label: 'Complemento', value: viewCnpjData?.estabelecimento?.complemento ?? null },
                                                ].map(({ label, value }) => (
                                                    <div key={label} className="flex flex-col gap-0.5">
                                                        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
                                                        <p className="text-sm text-gray-900 dark:text-white font-medium leading-tight">{toDisplayValue(value)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                        <section className="bg-gray-50/50 dark:bg-dark-hover/30 rounded-xl p-3 border border-gray-100 dark:border-dark-border">
                                            <div className="flex items-center gap-2 mb-2">
                                                <PhoneIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                                <h3 className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Contato</h3>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">E-mail</p>
                                                    <p className="text-sm text-gray-900 dark:text-white font-medium leading-tight break-all">{viewCnpjData?.estabelecimento?.email ?? clienteToView.email ?? '—'}</p>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Telefones</p>
                                                    <p className="text-sm text-gray-900 dark:text-white font-medium leading-tight">
                                                        {(viewCnpjData?.estabelecimento ? [viewCnpjData.estabelecimento.ddd1 && viewCnpjData.estabelecimento.telefone1 ? `${viewCnpjData.estabelecimento.ddd1} ${viewCnpjData.estabelecimento.telefone1}` : null, viewCnpjData.estabelecimento.ddd2 && viewCnpjData.estabelecimento.telefone2 ? `${viewCnpjData.estabelecimento.ddd2} ${viewCnpjData.estabelecimento.telefone2}` : null].filter(Boolean).join(' / ') : null) || clienteToView.telefone || '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                    {/* Quadro de Sócios - só quando veio da API */}
                                    {Array.isArray(viewCnpjData?.socios) && viewCnpjData.socios.length > 0 && (
                                        <section>
                                            <div className="flex items-center gap-2 mb-3">
                                                <UserGroupIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                <h3 className="text-sm font-bold text-gray-700 dark:text-dark-text uppercase tracking-wide">Quadro de Sócios</h3>
                                            </div>
                                            <div className="space-y-2">
                                                {viewCnpjData.socios.slice(0, 10).map((s: any, i: number) => (
                                                    <div key={i} className="bg-gray-50 dark:bg-dark-hover rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                                                        <p className="text-gray-900 dark:text-white font-medium">{s.nome || '—'}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{s.qualificacao_socio?.descricao || '—'}</p>
                                                    </div>
                                                ))}
                                                {viewCnpjData.socios.length > 10 && <p className="text-xs text-gray-500">+ {viewCnpjData.socios.length - 10} sócio(s)</p>}
                                            </div>
                                        </section>
                                    )}
                                    {/* Atividades Econômicas - só quando veio da API */}
                                    {viewCnpjData?.estabelecimento && (
                                    <section>
                                        <div className="flex items-center gap-2 mb-3">
                                            <CogIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            <h3 className="text-sm font-bold text-gray-700 dark:text-dark-text uppercase tracking-wide">Atividades Econômicas</h3>
                                        </div>
                                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-dark-border">
                                            <table className="min-w-full text-sm">
                                                <thead className="bg-gray-100 dark:bg-dark-hover">
                                                    <tr>
                                                        <th className="text-left py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Categoria</th>
                                                        <th className="text-left py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Código</th>
                                                        <th className="text-left py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Descrição</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                                                    {viewCnpjData.estabelecimento.atividade_principal && (
                                                        <tr className="bg-gray-50/50 dark:bg-dark-hover/50">
                                                            <td className="py-2 px-3 text-gray-700 dark:text-dark-text">Principal</td>
                                                            <td className="py-2 px-3 text-gray-900 dark:text-white">{viewCnpjData.estabelecimento.atividade_principal.id || '—'}</td>
                                                            <td className="py-2 px-3 text-gray-900 dark:text-white">{viewCnpjData.estabelecimento.atividade_principal.descricao || '—'}</td>
                                                        </tr>
                                                    )}
                                                    {(viewCnpjData.estabelecimento.atividades_secundarias || []).map((a: any, i: number) => (
                                                        <tr key={i}>
                                                            <td className="py-2 px-3 text-gray-700 dark:text-dark-text">Secundária</td>
                                                            <td className="py-2 px-3 text-gray-900 dark:text-white">{a.id || '—'}</td>
                                                            <td className="py-2 px-3 text-gray-900 dark:text-white">{a.descricao || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                    )}
                                    {/* Regime Tributário - só quando veio da API */}
                                    {viewCnpjData && ((viewCnpjData.simples != null || viewCnpjData.estabelecimento?.simples != null) || (viewCnpjData.simei != null || viewCnpjData.estabelecimento?.simei != null)) && (
                                        <section>
                                            <div className="flex items-center gap-2 mb-3">
                                                <ScaleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                <h3 className="text-sm font-bold text-gray-700 dark:text-dark-text uppercase tracking-wide">Regime Tributário</h3>
                                            </div>
                                            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-dark-border">
                                                <table className="min-w-full text-sm">
                                                    <thead className="bg-gray-100 dark:bg-dark-hover">
                                                        <tr>
                                                            <th className="text-left py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Regime</th>
                                                            <th className="text-left py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Optante?</th>
                                                            <th className="text-left py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Data da Opção</th>
                                                            <th className="text-left py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Data da Exclusão</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                                                        {(viewCnpjData.simples != null || viewCnpjData.estabelecimento?.simples != null) && (() => {
                                                            const s = viewCnpjData.simples ?? viewCnpjData.estabelecimento?.simples;
                                                            return (
                                                                <tr key="simples">
                                                                    <td className="py-2 px-3 text-gray-900 dark:text-white">Simples Nacional</td>
                                                                    <td className="py-2 px-3">{s.optante ? 'Sim' : 'Não'}</td>
                                                                    <td className="py-2 px-3 text-gray-900 dark:text-white">{s.data_opcao || '—'}</td>
                                                                    <td className="py-2 px-3 text-gray-900 dark:text-white">{s.data_exclusao || '—'}</td>
                                                                </tr>
                                                            );
                                                        })()}
                                                        {(viewCnpjData.simei != null || viewCnpjData.estabelecimento?.simei != null) && (() => {
                                                            const m = viewCnpjData.simei ?? viewCnpjData.estabelecimento?.simei;
                                                            return (
                                                                <tr key="mei">
                                                                    <td className="py-2 px-3 text-gray-900 dark:text-white">MEI</td>
                                                                    <td className="py-2 px-3">{m.optante ? 'Sim' : 'Não'}</td>
                                                                    <td className="py-2 px-3 text-gray-900 dark:text-white">{m.data_opcao || '—'}</td>
                                                                    <td className="py-2 px-3 text-gray-900 dark:text-white">{m.data_exclusao || '—'}</td>
                                                                </tr>
                                                            );
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </section>
                                    )}
                                    {/* Inscrição Estadual - só quando veio da API */}
                                    {viewCnpjData?.estabelecimento && Array.isArray(viewCnpjData.estabelecimento.inscricoes_estaduais) && viewCnpjData.estabelecimento.inscricoes_estaduais.length > 0 && (
                                        <section>
                                            <div className="flex items-center gap-2 mb-3">
                                                <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                <h3 className="text-sm font-bold text-gray-700 dark:text-dark-text uppercase tracking-wide">Inscrição Estadual (IE)</h3>
                                            </div>
                                            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-dark-border">
                                                <table className="min-w-full text-sm">
                                                    <thead className="bg-gray-100 dark:bg-dark-hover">
                                                        <tr>
                                                            <th className="text-left py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">UF</th>
                                                            <th className="text-left py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Inscrição Estadual</th>
                                                            <th className="text-left py-2 px-3 font-semibold text-gray-600 dark:text-gray-400">Situação Cadastral</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                                                        {viewCnpjData.estabelecimento.inscricoes_estaduais.map((ie: any, i: number) => (
                                                            <tr key={i}>
                                                                <td className="py-2 px-3 text-gray-900 dark:text-white">{ie.estado?.sigla || '—'}</td>
                                                                <td className="py-2 px-3 text-gray-900 dark:text-white">{ie.inscricao_estadual || '—'}</td>
                                                                <td className="py-2 px-3">{ie.ativo ? <span className="text-green-600 dark:text-green-400 font-medium">Ativo</span> : <span className="text-gray-500">Inativo</span>}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </section>
                                    )}
                                    {/* Disclaimer */}
                                    <div className="flex gap-2 rounded-lg bg-gray-100 dark:bg-dark-hover p-3 text-xs text-gray-600 dark:text-gray-400">
                                        <InformationCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                        <p>Essas informações são públicas, não confidenciais e sua divulgação está em conformidade com o Decreto nº 8.777/2016 e a Lei nº 12.527/2011 que assegura o direito constitucional de acesso à informação, mas temos total consideração pelo direito individual de privacidade.</p>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 px-4 py-3 sm:p-4 border-t border-gray-200 dark:border-dark-border shrink-0">
                                <button
                                    type="button"
                                    onClick={closeViewModal}
                                    className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-all font-semibold"
                                >
                                    Fechar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleOpenModal(clienteToView);
                                        closeViewModal();
                                    }}
                                    className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-medium font-semibold flex items-center gap-2"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    Editar
                                </button>
                        </div>
                    </div>
                </div>
                );
            })()}

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

            {/* Modal de Preview de Importação */}
            {modalPreviewImportOpen && dadosParaImportar && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-strong max-w-5xl w-full max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-orange-600 to-orange-500">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Preview de Importação</h2>
                                    <p className="text-sm text-white/80 mt-1">
                                        Revise os dados antes de importar
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setModalPreviewImportOpen(false);
                                        setDadosParaImportar(null);
                                    }}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Resumo */}
                        <div className="p-6 border-b border-gray-200 dark:border-dark-border bg-orange-50 dark:bg-orange-900/20">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                                        {dadosParaImportar.criar}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Novos Clientes</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                        {dadosParaImportar.atualizar}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Atualizações</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                                        {dadosParaImportar.totalClientes}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                                </div>
                            </div>
                        </div>

                        {/* Lista de Clientes */}
                        <div className="p-6 overflow-y-auto max-h-96">
                            <div className="space-y-3">
                                {dadosParaImportar.clientes.map((cliente: any, index: number) => (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-xl border-2 ${
                                            cliente.status === 'criar'
                                                ? 'border-green-200 bg-green-50 dark:bg-green-900/20'
                                                : 'border-blue-200 bg-blue-50 dark:bg-blue-900/20'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                        cliente.status === 'criar'
                                                            ? 'bg-green-600 text-white'
                                                            : 'bg-blue-600 text-white'
                                                    }`}>
                                                        {cliente.status === 'criar' ? '✨ NOVO' : '🔄 ATUALIZAR'}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                        cliente.tipo === 'PF'
                                                            ? 'bg-purple-100 text-purple-700'
                                                            : 'bg-indigo-100 text-indigo-700'
                                                    }`}>
                                                        {cliente.tipo === 'PF' ? '👤 PF' : '🏢 PJ'}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-gray-900 dark:text-dark-text text-lg">
                                                    {cliente.nome}
                                                </h3>
                                                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                                    <div>
                                                        <span className="text-gray-600 dark:text-gray-400">CPF/CNPJ:</span>
                                                        <span className="ml-2 font-medium text-gray-900 dark:text-dark-text">
                                                            {cliente.cpfCnpj}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600 dark:text-gray-400">Email:</span>
                                                        <span className="ml-2 font-medium text-gray-900 dark:text-dark-text">
                                                            {cliente.email}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600 dark:text-gray-400">Telefone:</span>
                                                        <span className="ml-2 font-medium text-gray-900 dark:text-dark-text">
                                                            {cliente.telefone}
                                                        </span>
                                                    </div>
                                                    {cliente.cidade && (
                                                        <div>
                                                            <span className="text-gray-600 dark:text-gray-400">Cidade:</span>
                                                            <span className="ml-2 font-medium text-gray-900 dark:text-dark-text">
                                                                {cliente.cidade}/{cliente.estado}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {cliente.status === 'atualizar' && cliente.clienteExistenteNome && (
                                                    <div className="mt-2 text-xs text-blue-700 dark:text-blue-400">
                                                        ℹ️ Atualizará: {cliente.clienteExistenteNome}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setModalPreviewImportOpen(false);
                                    setDadosParaImportar(null);
                                }}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmarImportacao}
                                disabled={importing}
                                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-medium font-semibold disabled:opacity-50"
                            >
                                {importing ? (
                                    <>
                                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Importando...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Confirmar Importação
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientesModerno;

