import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    type Project, ProjectStatus,
    type MaterialItem, type ProjectMaterial, ProjectMaterialStatus,
    type ProjectStage, ProjectStageStatus,
    type AdminStage, AdminStageStatus,
    type QualityCheckItem, QCCheckStatus,
    type Client,
    type User,
    UserRole,
    type Budget,
    ProjectType,
    BudgetStatus,
    type ProjectAttachment,
} from '../types';
import { ClientsIcon, CubeIcon } from '../constants';
import { axiosApiService } from '../services/axiosApi';
import { ENDPOINTS } from '../config/api';
import ScrollableRow from './ui/ScrollableRow';
import { scrollableNavItemClasses } from '../utils/responsiveNav';


// Icons
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>;
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const MagnifyingGlassIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /><path d="m15 5 4 4" /></svg>;
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const EllipsisVerticalIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>;
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
const XCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>;
const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>;
const UserIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const CalendarDaysIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const DocumentTextIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>;
const LinkIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;
const GripVerticalIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></svg>;
const ClipboardDocumentListIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75c0-.231-.035-.454-.1-.664M6.75 7.5h1.5v-1.5h-1.5v1.5zm1.5 0v-1.5c0-.828.672-1.5 1.5-1.5h1.5c.828 0 1.5.672 1.5 1.5v1.5m-3 0h3m-3 0h-1.5m1.5 0v1.5m0-1.5h1.5m-1.5 0h-1.5m6 6v-1.5m0 1.5h1.5m-1.5 0h-1.5m1.5 0v1.5m0-1.5h1.5m-1.5 0h-1.5" /></svg>;
const ViewColumnsIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" /></svg>;
const CheckBadgeIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const BuildingOfficeIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>;
const PaperClipIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81" /></svg>;


const getStatusClass = (status: ProjectStatus) => {
    switch (status) {
        case ProjectStatus.Planejamento: return 'bg-blue-100 text-blue-800';
        case ProjectStatus.EmExecucao: return 'bg-yellow-100 text-yellow-800';
        case ProjectStatus.ControleQualidade: return 'bg-purple-100 text-purple-800';
        case ProjectStatus.Concluido: return 'bg-green-100 text-green-800';
        case ProjectStatus.Cancelado: return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const getMaterialStatusClass = (status: ProjectMaterialStatus) => {
    switch(status) {
        case ProjectMaterialStatus.Alocado: return 'bg-green-100 text-green-800';
        case ProjectMaterialStatus.Pendente: return 'bg-yellow-100 text-yellow-800';
        case ProjectMaterialStatus.EmFalta: return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

const getRoleClass = (role: UserRole) => {
    switch (role) {
        case UserRole.Admin: return 'bg-red-100 text-red-800';
        case UserRole.Engenheiro: return 'bg-blue-100 text-blue-800';
        case UserRole.Tecnico: return 'bg-yellow-100 text-yellow-800';
        case UserRole.DesenhistaIndustrial: return 'bg-purple-100 text-purple-800';
        case UserRole.Desenvolvedor: return 'bg-gray-800 text-white';
        default: return 'bg-gray-100 text-gray-800';
    }
}

interface ProjetosProps {
    toggleSidebar: () => void;
    onNavigate: (view: string) => void;
    onViewBudget: (budgetId: string) => void;
    initialProjectId: string | null;
    clearInitialProjectId: () => void;
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}

type ProjectFormState = Omit<Project, 'id' | 'clientName' | 'responsibleUserName' | 'progress' | 'billOfMaterials' | 'stages' | 'adminStages' | 'qualityChecks' | 'obraStarted' | 'attachments'>;

type TeamManagementModalMode = 'view' | 'add' | 'edit';

const Projetos: React.FC<ProjetosProps> = ({ toggleSidebar, onNavigate, onViewBudget, initialProjectId, clearInitialProjectId, projects, setProjects }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'Todos'>('Todos');
    const [responsibleFilter, setResponsibleFilter] = useState<string | 'Todos'>('Todos');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [projectToView, setProjectToView] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const [viewModalActiveTab, setViewModalActiveTab] = useState('overview');
    
    // Kanban state
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<ProjectStage | null>(null);
    const [taskForm, setTaskForm] = useState<{ title: string; dueDate: string; status: ProjectStageStatus; linkedAdminStageId?: string }>({
        title: '',
        dueDate: '',
        status: ProjectStageStatus.AFazer,
        linkedAdminStageId: undefined,
    });
    const [draggingTask, setDraggingTask] = useState<ProjectStage | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<ProjectStageStatus | null>(null);

    // Team Management State
    const [isTeamManagementModalOpen, setIsTeamManagementModalOpen] = useState(false);
    const [teamManagementMode, setTeamManagementMode] = useState<TeamManagementModalMode>('view');
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [materials, setMaterials] = useState<MaterialItem[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [memberToEdit, setMemberToEdit] = useState<User | null>(null);
    const [memberToDelete, setMemberToDelete] = useState<User | null>(null);
    const [memberForm, setMemberForm] = useState({ name: '', email: '', role: UserRole.Tecnico });

    // Carregar dados da API
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const [projectsRes, clientsRes, materialsRes, budgetsRes, usuariosRes] = await Promise.all([
                axiosApiService.get<Project[]>(ENDPOINTS.PROJETOS),
                axiosApiService.get<Client[]>(ENDPOINTS.CLIENTES),
                axiosApiService.get<MaterialItem[]>(ENDPOINTS.MATERIAIS),
                axiosApiService.get<Budget[]>('/api/orcamentos'),
                axiosApiService.get<User[]>('/api/configuracoes/usuarios')
            ]);

            if (projectsRes.success && projectsRes.data) {
                setProjects(projectsRes.data);
            }
            if (clientsRes.success && clientsRes.data) {
                setClients(clientsRes.data);
            }
            if (materialsRes.success && materialsRes.data) {
                setMaterials(materialsRes.data);
            }
            if (budgetsRes.success && budgetsRes.data) {
                setBudgets(budgetsRes.data);
            }
            if (usuariosRes.success && usuariosRes.data) {
                // Todos os usuários para atribuição/equipe (independente do role)
                const usuariosArray = Array.isArray(usuariosRes.data) ? usuariosRes.data : [];
                setTeamMembers(usuariosArray as User[]);
            }
        } catch (err) {
            setError('Erro ao carregar dados');
            console.error('Erro ao carregar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Admin Stages State
    const [isExtendDeadlineModalOpen, setIsExtendDeadlineModalOpen] = useState(false);
    const [stageToExtend, setStageToExtend] = useState<{ projectId: string; stageId: string; stageName: string } | null>(null);
    const [extensionReason, setExtensionReason] = useState('');
    const [extensionHours, setExtensionHours] = useState(24);


    const [formState, setFormState] = useState<ProjectFormState>({
        name: '', clientId: '', budgetId: '', documentNumber: '', projectType: ProjectType.Tecnico,
        startDate: '', endDate: '', responsibleUserId: '', description: '', status: ProjectStatus.Planejamento,
    });
    
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    const handleOpenViewModal = (project: Project) => { setProjectToView(project); setViewModalActiveTab('overview'); setOpenDropdownId(null); };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openDropdownId && dropdownRefs.current[openDropdownId] && !dropdownRefs.current[openDropdownId]?.contains(event.target as Node)) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openDropdownId]);
    
    useEffect(() => {
        if (initialProjectId) {
            const projectToOpen = projects.find(p => p.id === initialProjectId);
            if (projectToOpen) {
                handleOpenViewModal(projectToOpen);
            }
            clearInitialProjectId();
        }
    }, [initialProjectId, projects, clearInitialProjectId]);

    const filteredProjects = useMemo(() => {
        return projects
            .filter(p => statusFilter === 'Todos' || p.status === statusFilter)
            .filter(p => responsibleFilter === 'Todos' || p.responsibleUserId === responsibleFilter)
            .filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.id.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [projects, searchTerm, statusFilter, responsibleFilter]);

    const resetForm = () => {
        setFormState({
            name: '', clientId: '', budgetId: '', documentNumber: '', projectType: ProjectType.Tecnico,
            startDate: new Date().toISOString().split('T')[0], endDate: '', responsibleUserId: '',
            description: '', status: ProjectStatus.Planejamento,
        });
    };
    
    const handleOpenModal = (project: Project | null = null) => {
        if (project) {
            setProjectToEdit(project);
            const { clientName, responsibleUserName, progress, billOfMaterials, stages, qualityChecks, obraStarted, attachments, ...formData } = project;
            setFormState(formData);
        } else {
            setProjectToEdit(null);
            resetForm();
        }
        setIsModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setProjectToEdit(null);
        resetForm();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const client = clients.find(c => c.id === formState.clientId);
        const responsible = teamMembers.find(u => u.id === formState.responsibleUserId);

        if (!client || !responsible) {
            alert('Cliente ou responsável inválido.');
            return;
        }

        if (projectToEdit) {
            const updatedProject: Project = {
                ...projectToEdit,
                ...formState,
                clientName: client.name!,
                responsibleUserName: responsible.name,
            };
            // Recalcular progresso
            updatedProject.progress = calculateProgress(updatedProject);
            setProjects(prev => prev.map(p => p.id === projectToEdit.id ? updatedProject : p));
        } else {
            // Gerar 10 etapas administrativas fixas
            const adminStagesNames = [
                'Organizar Projeto',
                'Abertura de SR',
                'Emitir ART',
                'Concluir Projeto',
                'Protocolar Projeto',
                'Aprovação do Projeto',
                'Revisão Final',
                'Cobrança',
                'Acervo Técnico',
                'Vistoria',
            ];

            const startDate = new Date(formState.startDate);
            const adminStages: AdminStage[] = adminStagesNames.map((name, index) => {
                const deadline = new Date(startDate);
                deadline.setHours(deadline.getHours() + 24); // 24h de prazo

                return {
                    id: `ADMIN-STAGE-${Date.now()}-${index + 1}`,
                    name,
                    order: index + 1,
                    status: AdminStageStatus.Pending,
                    deadline: deadline.toISOString(),
                    startedAt: startDate.toISOString(),
                };
            });

            const newProject: Project = {
                id: `PROJ-${String(projects.length + 1).padStart(3, '0')}`,
                ...formState,
                clientName: client.name!,
                responsibleUserName: responsible.name,
                progress: 0,
                billOfMaterials: [], 
                stages: [], 
                adminStages, 
                qualityChecks: [], 
                attachments: [],
                obraStarted: false,
            };
            setProjects(prev => [newProject, ...prev]);
        }
        handleCloseModal();
    };
    
    const handleOpenDeleteModal = (project: Project) => { setProjectToDelete(project); setOpenDropdownId(null); };
    const handleCloseDeleteModal = () => setProjectToDelete(null);
    const handleConfirmDelete = () => {
        if (projectToDelete) {
            setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
            handleCloseDeleteModal();
        }
    };
    
    const handleCloseViewModal = () => setProjectToView(null);

    const handleStartObra = (projectId: string) => {
        const updatedProjects = projects.map(p => {
            if (p.id === projectId) {
                return { ...p, obraStarted: true, status: ProjectStatus.EmExecucao };
            }
            return p;
        });
        setProjects(updatedProjects);

        // Also update the currently viewed project if it's the one being changed
        if (projectToView?.id === projectId) {
            setProjectToView(prev => prev ? { ...prev, obraStarted: true, status: ProjectStatus.EmExecucao } : null);
        }
    };

    const handleAllocateMaterial = (materialToAllocate: ProjectMaterial) => {
        if (!projectToView) return;
        const materialInStock = materials.find(m => m.id === materialToAllocate.materialId);
        const isAvailable = materialInStock && materialInStock.stock >= materialToAllocate.requiredQuantity;
        const newStatus = isAvailable ? ProjectMaterialStatus.Alocado : ProjectMaterialStatus.EmFalta;
        const updatedBillOfMaterials = projectToView.billOfMaterials.map(m =>
            m.materialId === materialToAllocate.materialId ? { ...m, status: newStatus } : m
        );
        const updatedProject = { ...projectToView, billOfMaterials: updatedBillOfMaterials };
        setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
        setProjectToView(updatedProject);
    };
    
    const handleUpdateQcStatus = (qcItemId: string, newStatus: QCCheckStatus) => {
        if (!projectToView) return;
        const updatedQualityChecks = projectToView.qualityChecks.map(qc => 
            qc.id === qcItemId ? { ...qc, status: newStatus } : qc
        );
        const updatedProject = { ...projectToView, qualityChecks: updatedQualityChecks };
        setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
        setProjectToView(updatedProject);
    };
    
    // Kanban Handlers
    const handleOpenAddTaskModal = (status: ProjectStageStatus) => {
        setTaskToEdit(null);
        setTaskForm({ title: '', dueDate: '', status, linkedAdminStageId: undefined });
        setIsTaskModalOpen(true);
    };

    const handleOpenEditTaskModal = (task: ProjectStage) => {
        setTaskToEdit(task);
        setTaskForm({
            title: task.title,
            dueDate: task.dueDate || '',
            status: task.status,
            linkedAdminStageId: task.linkedAdminStageId,
        });
        setIsTaskModalOpen(true);
    };

    const handleCloseTaskModal = () => {
        setIsTaskModalOpen(false);
        setTaskToEdit(null);
    };

    const handleSaveTask = () => {
        if (!projectToView || !taskForm.title) {
            alert("O título da tarefa é obrigatório.");
            return;
        };

        let updatedStages: ProjectStage[];

        if (taskToEdit) {
            updatedStages = projectToView.stages.map(stage =>
                stage.id === taskToEdit.id
                    ? { 
                        ...stage, 
                        title: taskForm.title, 
                        dueDate: taskForm.dueDate || undefined, 
                        status: taskForm.status,
                        linkedAdminStageId: taskForm.linkedAdminStageId 
                      }
                    : stage
            );
        } else {
            const newTask: ProjectStage = {
                id: `STG-${projectToView.id}-${Date.now()}`,
                title: taskForm.title,
                dueDate: taskForm.dueDate || undefined,
                status: taskForm.status,
                linkedAdminStageId: taskForm.linkedAdminStageId,
            };
            updatedStages = [...projectToView.stages, newTask];
        }
        
        const updatedProject = { 
            ...projectToView, 
            stages: updatedStages,
            progress: 0 // Será recalculado
        };

        // Recalcular progresso
        updatedProject.progress = calculateProgress(updatedProject);

        setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
        setProjectToView(updatedProject); 
        
        handleCloseTaskModal();
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: ProjectStage) => {
        setDraggingTask(task);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: ProjectStageStatus) => {
        e.preventDefault();
        if (draggingTask && draggingTask.status !== status) {
            setDragOverColumn(status);
        }
    };

    const handleDragLeave = () => {
        setDragOverColumn(null);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: ProjectStageStatus) => {
        e.preventDefault();
        if (!draggingTask || !projectToView || draggingTask.status === newStatus) {
            return;
        }

        const updatedStages = projectToView.stages.map(stage =>
            stage.id === draggingTask.id ? { ...stage, status: newStatus } : stage
        );
        
        const updatedProject = { 
            ...projectToView, 
            stages: updatedStages,
            progress: 0 // Será recalculado
        };

        // Recalcular progresso
        updatedProject.progress = calculateProgress(updatedProject);
        
        setProjects(projects.map(p => (p.id === updatedProject.id ? updatedProject : p)));
        setProjectToView(updatedProject);
        
        setDraggingTask(null);
        setDragOverColumn(null);
    };
    
    const handleDragEnd = () => {
        setDraggingTask(null);
        setDragOverColumn(null);
    };

    // Team Management Handlers
    const openTeamModal = () => setIsTeamManagementModalOpen(true);
    const closeTeamModal = () => {
        setIsTeamManagementModalOpen(false);
        setTeamManagementMode('view');
        setMemberToEdit(null);
        setMemberForm({ name: '', email: '', role: UserRole.Tecnico });
    };

    const handleOpenAddMember = () => {
        setMemberToEdit(null);
        setMemberForm({ name: '', email: '', role: UserRole.Tecnico });
        setTeamManagementMode('add');
    };
    
    const handleOpenEditMember = (user: User) => {
        setMemberToEdit(user);
        setMemberForm({ name: user.name, email: user.email, role: user.role });
        setTeamManagementMode('edit');
    };
    
    const handleMemberFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (memberToEdit) {
            setTeamMembers(teamMembers.map(u => u.id === memberToEdit.id ? { ...memberToEdit, ...memberForm } : u));
        } else {
            const newUser: User = { id: `USR-${Date.now()}`, ...memberForm };
            setTeamMembers([...teamMembers, newUser]);
        }
        setTeamManagementMode('view');
    };

    const handleConfirmDeleteMember = () => {
        if (memberToDelete) {
            setTeamMembers(teamMembers.filter(u => u.id !== memberToDelete.id));
            setMemberToDelete(null);
        }
    };
    
    // Attachment Handlers
    const handleAttachmentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && projectToView) {
            const files = Array.from(event.target.files);
            const newAttachments: ProjectAttachment[] = files.map(file => ({
                id: `ATT-${Date.now()}-${file.name}`,
                fileName: file.name,
                fileUrl: URL.createObjectURL(file), // In a real app, this would be an upload URL
                uploadedAt: new Date().toISOString(),
            }));

            const updatedProject = {
                ...projectToView,
                attachments: [...(projectToView.attachments || []), ...newAttachments]
            };
            
            setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
            setProjectToView(updatedProject);
        }
    };
    
    const handleRemoveAttachment = (attachmentId: string) => {
        if (projectToView) {
            const updatedAttachments = projectToView.attachments?.filter(att => att.id !== attachmentId);
            const updatedProject = { ...projectToView, attachments: updatedAttachments };
            setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
            setProjectToView(updatedProject);
        }
    };

    // Admin Stages Handlers
    const calculateProgress = (project: Project): number => {
        const adminCompleted = project.adminStages.filter(s => s.status === AdminStageStatus.Completed).length;
        const tasksCompleted = project.stages.filter(s => s.status === ProjectStageStatus.Concluido).length;
        const totalAdminStages = project.adminStages.length; // 10
        const totalTasks = project.stages.length;
        
        if (totalAdminStages + totalTasks === 0) return 0;
        
        return Math.round(((adminCompleted + tasksCompleted) / (totalAdminStages + totalTasks)) * 100);
    };

    const handleCompleteAdminStage = (stageId: string) => {
        if (!projectToView) return;

        const updatedAdminStages = projectToView.adminStages.map(stage =>
            stage.id === stageId
                ? { ...stage, status: AdminStageStatus.Completed, completedAt: new Date().toISOString() }
                : stage
        );

        const updatedProject = {
            ...projectToView,
            adminStages: updatedAdminStages,
            progress: 0 // Será recalculado
        };

        // Recalcular progresso
        updatedProject.progress = calculateProgress(updatedProject);

        setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
        setProjectToView(updatedProject);
    };

    const handleOpenExtendDeadlineModal = (projectId: string, stageId: string, stageName: string) => {
        setStageToExtend({ projectId, stageId, stageName });
        setExtensionReason('');
        setExtensionHours(24);
        setIsExtendDeadlineModalOpen(true);
    };

    const handleCloseExtendDeadlineModal = () => {
        setIsExtendDeadlineModalOpen(false);
        setStageToExtend(null);
        setExtensionReason('');
        setExtensionHours(24);
    };

    const handleConfirmExtendDeadline = () => {
        if (!projectToView || !stageToExtend || !extensionReason.trim()) {
            alert('Por favor, informe a justificativa para a extensão de prazo.');
            return;
        }

        const updatedAdminStages = projectToView.adminStages.map(stage => {
            if (stage.id === stageToExtend.stageId) {
                const currentDeadline = new Date(stage.extendedDeadline || stage.deadline);
                const newDeadline = new Date(currentDeadline);
                newDeadline.setHours(newDeadline.getHours() + extensionHours);

                return {
                    ...stage,
                    extendedDeadline: newDeadline.toISOString(),
                    extensionReason: extensionReason.trim()
                };
            }
            return stage;
        });

        const updatedProject = {
            ...projectToView,
            adminStages: updatedAdminStages
        };

        setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
        setProjectToView(updatedProject);
        handleCloseExtendDeadlineModal();
    };


    return (
        <div className="p-4 sm:p-8">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div className="flex items-center">
                    <button onClick={toggleSidebar} className="lg:hidden mr-4 p-1 text-brand-gray-500 rounded-md hover:bg-brand-gray-100" aria-label="Open sidebar">
                        <Bars3Icon className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-3xl font-bold text-brand-gray-800">Projetos</h1>
                        <p className="text-sm sm:text-base text-brand-gray-500">Gestão de projetos e obras</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={openTeamModal} className="flex items-center justify-center bg-white border border-brand-gray-300 text-brand-gray-700 font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-brand-gray-50 transition-colors">
                        <ClientsIcon className="w-5 h-5 mr-2" />
                        Gerenciar Equipe
                    </button>
                    <button onClick={() => handleOpenModal()} className="flex items-center justify-center bg-brand-blue text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-brand-blue/90 transition-colors">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Novo Projeto
                    </button>
                </div>
            </header>

            <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <div className="relative w-full sm:max-w-xs">
                        <input
                            type="text"
                            placeholder="Buscar por nome, cliente, ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-brand-blue focus:border-brand-blue"
                        />
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray-400" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-brand-gray-600">Status:</span>
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'Todos')}
                                className="border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-brand-blue focus:border-brand-blue"
                            >
                                <option value="Todos">Todos</option>
                                {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                         <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-brand-gray-600">Responsável:</span>
                            <select 
                                value={responsibleFilter} 
                                onChange={(e) => setResponsibleFilter(e.target.value)}
                                className="border border-brand-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-brand-blue focus:border-brand-blue"
                            >
                                <option value="Todos">Todos</option>
                                {teamMembers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProjects.map((project) => (
                         <div key={project.id} className="bg-white rounded-lg border border-brand-gray-200 shadow-sm flex flex-col p-4 transition-shadow hover:shadow-lg">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-lg text-brand-gray-800 leading-tight flex-1 pr-2">{project.name}</h3>
                                <div className="relative flex-shrink-0">
                                    <button onClick={() => setOpenDropdownId(project.id === openDropdownId ? null : project.id)} className="p-1 -mr-2 -mt-2 rounded-full text-brand-gray-400 hover:bg-brand-gray-100">
                                        <EllipsisVerticalIcon className="w-5 h-5" />
                                    </button>
                                    {openDropdownId === project.id && (
                                        <div ref={el => { dropdownRefs.current[project.id] = el; }} className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                            <div className="py-1">
                                                <a href="#" onClick={(e) => { e.preventDefault(); handleOpenViewModal(project); }} className="flex items-center gap-2 px-4 py-2 text-sm text-brand-gray-700 hover:bg-brand-gray-100"><EyeIcon className="w-4 h-4" /> Visualizar</a>
                                                <a href="#" onClick={(e) => { e.preventDefault(); handleOpenModal(project); }} className="flex items-center gap-2 px-4 py-2 text-sm text-brand-gray-700 hover:bg-brand-gray-100"><PencilIcon className="w-4 h-4" /> Editar</a>
                                                <a href="#" onClick={(e) => { e.preventDefault(); handleOpenDeleteModal(project); }} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"><TrashIcon className="w-4 h-4" /> Excluir</a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 mt-2 text-xs font-semibold rounded-full self-start ${getStatusClass(project.status)}`}>{project.status}</span>
                            <p className="text-sm font-medium text-brand-blue mt-3">{project.clientName}</p>
                            
                            <div className="text-sm text-brand-gray-600 flex items-center gap-2 my-4">
                                <UserIcon className="w-5 h-5 text-brand-gray-400" />
                                <span>Resp: <strong>{project.responsibleUserName}</strong></span>
                            </div>

                            <div className="mt-auto pt-4 border-t border-brand-gray-100">
                                <div className="flex justify-between items-center mb-1 text-sm">
                                    <span className="text-brand-gray-500">Progresso</span>
                                    <span className="font-semibold text-brand-gray-700">{project.progress}%</span>
                                </div>
                                <div className="w-full bg-brand-gray-200 rounded-full h-2.5">
                                    <div className="bg-brand-blue h-2.5 rounded-full" style={{ width: `${project.progress}%` }}></div>
                                </div>
                            </div>
                         </div>
                    ))}
                </div>
            </div>
            
            {/* Add/Edit Project Modal - MELHORADO */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn" aria-modal="true" role="dialog">
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col animate-slideUp">
                        {/* Header com cor S3E */}
                        <div className="relative p-6 bg-gradient-to-r from-brand-s3e to-[#0d2847] text-white rounded-t-2xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                                        <span className="text-2xl">{projectToEdit ? '✏️' : '✨'}</span>
                                        {projectToEdit ? 'Editar Projeto' : 'Novo Projeto'}
                                    </h2>
                                    <p className="text-blue-100 text-sm">
                                        {projectToEdit ? 'Atualize as informações do projeto' : 'Preencha os dados para criar um novo projeto'}
                                    </p>
                                </div>
                                <button type="button" onClick={handleCloseModal} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto flex-grow">
                            {/* Seção: Informações Básicas */}
                            <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-brand-blue rounded-lg">
                                        <DocumentTextIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold text-brand-gray-800">Informações Básicas</h3>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-brand-gray-700 mb-2 flex items-center gap-2">
                                            <span className="text-brand-blue">●</span>
                                            Nome do Projeto
                                        </label>
                                        <input 
                                            type="text" 
                                            value={formState.name} 
                                            onChange={e => setFormState({...formState, name: e.target.value})} 
                                            className="w-full px-4 py-3 border-2 border-brand-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all" 
                                            placeholder="Ex: Instalação Elétrica Industrial - Fábrica XYZ"
                                            required 
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-brand-gray-700 mb-2 flex items-center gap-2">
                                                <ClientsIcon className="w-4 h-4 text-brand-blue" />
                                                Cliente
                                            </label>
                                            <select 
                                                value={formState.clientId} 
                                                onChange={e => setFormState({...formState, clientId: e.target.value})} 
                                                className="w-full px-4 py-3 border-2 border-brand-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all" 
                                                required
                                            >
                                                <option value="">Selecione um cliente...</option>
                                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-brand-gray-700 mb-2 flex items-center gap-2">
                                                <UserIcon className="w-4 h-4 text-brand-blue" />
                                                Responsável Técnico
                                            </label>
                                            <select 
                                                value={formState.responsibleUserId} 
                                                onChange={e => setFormState({...formState, responsibleUserId: e.target.value})} 
                                                className="w-full px-4 py-3 border-2 border-brand-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all" 
                                                required
                                            >
                                                <option value="">Selecione o responsável...</option>
                                                {teamMembers.map(u => <option key={u.id} value={u.id}>{u.name} - {u.role}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Seção: Prazos e Tipo */}
                            <div className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl border border-purple-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-purple-600 rounded-lg">
                                        <CalendarDaysIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold text-brand-gray-800">Prazos e Classificação</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-brand-gray-700 mb-2 flex items-center gap-2">
                                                <ClockIcon className="w-4 h-4 text-purple-600" />
                                                Data de Início
                                            </label>
                                            <input 
                                                type="date" 
                                                value={formState.startDate} 
                                                onChange={e => setFormState({...formState, startDate: e.target.value})} 
                                                className="w-full px-4 py-3 border-2 border-brand-gray-200 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all" 
                                                required 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-brand-gray-700 mb-2 flex items-center gap-2">
                                                <CalendarDaysIcon className="w-4 h-4 text-purple-600" />
                                                Data de Término Prevista
                                            </label>
                                            <input 
                                                type="date" 
                                                value={formState.endDate} 
                                                onChange={e => setFormState({...formState, endDate: e.target.value})} 
                                                className="w-full px-4 py-3 border-2 border-brand-gray-200 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all" 
                                                required 
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-brand-gray-700 mb-2 flex items-center gap-2">
                                                <BuildingOfficeIcon className="w-4 h-4 text-purple-600" />
                                                Tipo de Projeto
                                            </label>
                                            <select 
                                                value={formState.projectType} 
                                                onChange={e => setFormState({...formState, projectType: e.target.value as ProjectType})} 
                                                className="w-full px-4 py-3 border-2 border-brand-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all" 
                                                required
                                            >
                                                {Object.values(ProjectType).map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-brand-gray-700 mb-2 flex items-center gap-2">
                                                <CheckCircleIcon className="w-4 h-4 text-purple-600" />
                                                Status
                                            </label>
                                            <select 
                                                value={formState.status} 
                                                onChange={e => setFormState({...formState, status: e.target.value as ProjectStatus})} 
                                                className="w-full px-4 py-3 border-2 border-brand-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all" 
                                                required
                                            >
                                                {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Seção: Informações Complementares */}
                            <div className="bg-gradient-to-br from-green-50 to-white p-5 rounded-xl border border-green-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-green-600 rounded-lg">
                                        <LinkIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold text-brand-gray-800">Informações Complementares</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-brand-gray-700 mb-2 flex items-center gap-2">
                                                <DocumentTextIcon className="w-4 h-4 text-green-600" />
                                                Orçamento Aprovado
                                                <span className="text-xs text-brand-gray-400 ml-auto">(Opcional)</span>
                                            </label>
                                            <select 
                                                value={formState.budgetId || ''} 
                                                onChange={e => {
                                                    const selectedBudgetId = e.target.value;
                                                    setFormState({...formState, budgetId: selectedBudgetId});
                                                    
                                                    // Preencher datas automaticamente do orçamento
                                                    if (selectedBudgetId) {
                                                        const selectedBudget = budgets.find(b => b.id === selectedBudgetId);
                                                        if (selectedBudget) {
                                                            const hoje = new Date().toISOString().split('T')[0];
                                                            const validade = selectedBudget.validity ? new Date(selectedBudget.validity).toISOString().split('T')[0] : '';
                                                            
                                                            setFormState(prev => ({
                                                                ...prev,
                                                                budgetId: selectedBudgetId,
                                                                startDate: hoje,
                                                                endDate: validade || hoje
                                                            }));
                                                        }
                                                    }
                                                }} 
                                                className="w-full px-4 py-3 border-2 border-brand-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all"
                                            >
                                                <option value="">Nenhum orçamento vinculado</option>
                                                {budgets.filter(b => b.status === BudgetStatus.Aprovado).map(b => (
                                                    <option key={b.id} value={b.id}>
                                                        {b.projectName || b.id} - R$ {b.totalPrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </option>
                                                ))}
                                            </select>
                                            {formState.budgetId && (
                                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Datas preenchidas automaticamente
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-brand-gray-700 mb-2 flex items-center gap-2">
                                                <DocumentTextIcon className="w-4 h-4 text-green-600" />
                                                Nº do Documento
                                                <span className="text-xs text-brand-gray-400 ml-auto">(ART, RRT, etc.)</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                value={formState.documentNumber || ''} 
                                                onChange={e => setFormState({...formState, documentNumber: e.target.value})} 
                                                className="w-full px-4 py-3 border-2 border-brand-gray-200 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all"
                                                placeholder="Ex: ART-12345-2024"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-brand-gray-700 mb-2 flex items-center gap-2">
                                            <DocumentTextIcon className="w-4 h-4 text-green-600" />
                                            Descrição do Projeto
                                        </label>
                                        <textarea 
                                            value={formState.description} 
                                            onChange={e => setFormState({...formState, description: e.target.value})} 
                                            rows={4} 
                                            className="w-full px-4 py-3 border-2 border-brand-gray-200 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 transition-all resize-none"
                                            placeholder="Descreva os objetivos, escopo e principais características do projeto..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer com Botões Aprimorados */}
                        <div className="p-6 bg-brand-gray-50 border-t border-brand-gray-200 rounded-b-2xl flex justify-between items-center">
                            <div className="text-sm text-brand-gray-500">
                                <span className="text-red-500">*</span> Campos obrigatórios
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={handleCloseModal} 
                                    className="px-6 py-2.5 bg-white border-2 border-brand-gray-300 rounded-lg font-semibold text-brand-gray-700 hover:bg-brand-gray-50 hover:border-brand-gray-400 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-6 py-2.5 bg-brand-s3e text-white rounded-lg font-semibold hover:bg-opacity-90 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                >
                                    <span className="text-lg">{projectToEdit ? '💾' : '✨'}</span>
                                    {projectToEdit ? 'Salvar Alterações' : 'Criar Projeto'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
            
            {projectToDelete && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
                     <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                        <div className="p-6">
                            <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
                            <p className="text-sm mt-2 text-brand-gray-600">Tem certeza que deseja excluir o projeto <strong>{projectToDelete.name}</strong>?</p>
                        </div>
                        <div className="p-4 bg-brand-gray-50 border-t flex justify-end gap-3">
                            <button onClick={handleCloseDeleteModal} className="px-4 py-2 bg-white border rounded-lg font-semibold">Cancelar</button>
                            <button onClick={handleConfirmDelete} className="px-4 py-2 bg-brand-red text-white rounded-lg font-semibold">Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Project Modal */}
            {projectToView && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn" aria-modal="true" role="dialog">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col animate-scaleIn">
                        {/* Header com cor S3E */}
                        <div className="bg-gradient-to-r from-brand-s3e to-[#0d2847] p-6 rounded-t-xl flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <span className="text-2xl">📋</span>
                                    {projectToView.name}
                                </h2>
                                <p className="text-blue-100 text-sm mt-1">Cliente: {projectToView.clientName} | ID: {projectToView.id}</p>
                            </div>
                            <button onClick={handleCloseViewModal} className="p-2 rounded-full text-white hover:bg-white hover:bg-opacity-20 transition-colors"><XMarkIcon className="w-6 h-6"/></button>
                        </div>
                        
                        <div className="border-b border-brand-gray-200 bg-brand-gray-50">
                             <ScrollableRow as="nav" ariaLabel="Abas do projeto" className="px-6 -mb-px gap-4">
                                <button onClick={() => setViewModalActiveTab('overview')} className={`${scrollableNavItemClasses} flex items-center gap-2 py-3 px-3 border-b-2 font-semibold text-sm ${viewModalActiveTab === 'overview' ? 'border-brand-s3e text-brand-s3e' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}><ClipboardDocumentListIcon className="w-5 h-5"/> Visão Geral</button>
                                <button onClick={() => setViewModalActiveTab('adminStages')} className={`${scrollableNavItemClasses} flex items-center gap-2 py-3 px-3 border-b-2 font-semibold text-sm ${viewModalActiveTab === 'adminStages' ? 'border-brand-s3e text-brand-s3e' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}><span className="text-lg">📊</span> Etapas Admin</button>
                                <button onClick={() => setViewModalActiveTab('materials')} className={`${scrollableNavItemClasses} flex items-center gap-2 py-3 px-3 border-b-2 font-semibold text-sm ${viewModalActiveTab === 'materials' ? 'border-brand-s3e text-brand-s3e' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}><CubeIcon className="w-5 h-5"/> Materiais</button>
                                <button onClick={() => setViewModalActiveTab('stages')} className={`${scrollableNavItemClasses} flex items-center gap-2 py-3 px-3 border-b-2 font-semibold text-sm ${viewModalActiveTab === 'stages' ? 'border-brand-s3e text-brand-s3e' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}><ViewColumnsIcon className="w-5 h-5"/> Kanban Engenharia</button>
                                <button onClick={() => setViewModalActiveTab('qc')} className={`${scrollableNavItemClasses} flex items-center gap-2 py-3 px-3 border-b-2 font-semibold text-sm ${viewModalActiveTab === 'qc' ? 'border-brand-s3e text-brand-s3e' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}><CheckBadgeIcon className="w-5 h-5"/> Qualidade</button>
                            </ScrollableRow>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto bg-brand-gray-50 flex-grow">
                           {viewModalActiveTab === 'overview' && (
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                        <div className="flex items-start gap-3"><ClientsIcon className="w-5 h-5 text-brand-gray-400 mt-0.5"/><div><strong className="block text-brand-gray-500">CLIENTE</strong><span className="font-semibold text-brand-gray-800">{projectToView.clientName}</span></div></div>
                                        <div className="flex items-start gap-3"><UserIcon className="w-5 h-5 text-brand-gray-400 mt-0.5"/><div><strong className="block text-brand-gray-500">RESPONSÁVEL</strong><span className="font-semibold text-brand-gray-800">{projectToView.responsibleUserName}</span></div></div>
                                        <div className="flex items-start gap-3"><CalendarDaysIcon className="w-5 h-5 text-brand-gray-400 mt-0.5"/><div><strong className="block text-brand-gray-500">PRAZO</strong><span className="font-semibold text-brand-gray-800">{new Date(projectToView.startDate + 'T00:00').toLocaleDateString('pt-BR')} - {new Date(projectToView.endDate + 'T00:00').toLocaleDateString('pt-BR')}</span></div></div>
                                        <div className="flex items-start gap-3"><DocumentTextIcon className="w-5 h-5 text-brand-gray-400 mt-0.5"/><div><strong className="block text-brand-gray-500">DOCUMENTO</strong><span className="font-semibold text-brand-gray-800">{projectToView.documentNumber || 'N/A'}</span></div></div>
                                        {projectToView.budgetId && <div className="flex items-start gap-3"><LinkIcon className="w-5 h-5 text-brand-gray-400 mt-0.5"/><div><strong className="block text-brand-gray-500">ORÇAMENTO VINCULADO</strong><button onClick={() => onViewBudget(projectToView.budgetId!)} className="font-semibold text-brand-blue hover:underline">{projectToView.budgetId}</button></div></div>}
                                    </div>
                                    <div className="bg-white p-6 rounded-lg shadow-sm">
                                        <h4 className="text-lg font-semibold text-brand-gray-800 mb-2">Descrição do Projeto</h4>
                                        <p className="text-sm text-brand-gray-700 whitespace-pre-wrap">{projectToView.description || 'Nenhuma descrição fornecida.'}</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-lg shadow-sm">
                                        <h4 className="text-lg font-semibold text-brand-gray-800 mb-4">Anexos</h4>
                                        <input type="file" multiple onChange={handleAttachmentUpload} ref={attachmentInputRef} className="hidden" />
                                        <button onClick={() => attachmentInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-brand-blue-light text-brand-blue font-semibold rounded-lg hover:bg-brand-blue-light/80 transition-colors">
                                            <PaperClipIcon className="w-5 h-5" />
                                            Adicionar Anexo
                                        </button>
                                        <div className="mt-4 space-y-2">
                                            {projectToView.attachments?.map(att => (
                                                <div key={att.id} className="flex items-center justify-between p-2 bg-brand-gray-100 rounded-md">
                                                    <span className="text-sm font-medium text-brand-gray-700">{att.fileName}</span>
                                                    <div className="flex items-center gap-2">
                                                        <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-blue hover:underline">Visualizar/Baixar</a>
                                                        <button onClick={() => handleRemoveAttachment(att.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                            {(projectToView.attachments?.length === 0) && (
                                                <p className="text-sm text-brand-gray-500">Nenhum anexo adicionado.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                           )}
                           {viewModalActiveTab === 'materials' && (
                                <div className="bg-white p-6 rounded-lg shadow-sm">
                                    <h4 className="text-lg font-semibold text-brand-gray-800 mb-4">Lista de Materiais</h4>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-brand-gray-50 text-xs uppercase text-brand-gray-500"><tr className="text-left"><th className="p-3">Material</th><th className="p-3">Qtd. Req.</th><th className="p-3">Status</th><th className="p-3">Ações</th></tr></thead>
                                            <tbody className="divide-y">
                                                {projectToView.billOfMaterials.map(mat => (
                                                    <tr key={mat.materialId}>
                                                        <td className="p-3 font-medium text-brand-gray-800">{mat.name} <span className="text-brand-gray-500">({mat.sku})</span></td>
                                                        <td className="p-3">{mat.requiredQuantity}</td>
                                                        <td className="p-3"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getMaterialStatusClass(mat.status)}`}>{mat.status}</span></td>
                                                        <td className="p-3">
                                                            {mat.status === ProjectMaterialStatus.Pendente && (
                                                                <button onClick={() => handleAllocateMaterial(mat)} className="px-2 py-1 bg-brand-blue text-white text-xs font-semibold rounded-md hover:bg-brand-blue/90">Alocar</button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                           )}
                           {viewModalActiveTab === 'stages' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                                    {Object.values(ProjectStageStatus).map(status => (
                                        <div key={status} onDragOver={(e) => handleDragOver(e, status)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, status)} className={`rounded-lg p-3 flex flex-col ${dragOverColumn === status ? 'bg-brand-blue-light' : 'bg-brand-gray-100'}`}>
                                            <h4 className="font-semibold text-brand-gray-800 mb-4">{status} ({projectToView.stages.filter(s => s.status === status).length})</h4>
                                            <div className="space-y-3 overflow-y-auto flex-grow">
                                                {projectToView.stages.filter(s => s.status === status).map(task => (
                                                     <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task)} onDragEnd={handleDragEnd} className="bg-white p-3 rounded-md shadow-sm cursor-grab active:cursor-grabbing border-l-4 border-brand-s3e flex justify-between items-start group">
                                                         <div className="flex-1">
                                                            <p className="font-semibold text-brand-gray-900">{task.title}</p>
                                                            {task.dueDate && <p className="text-xs text-brand-gray-500 mt-1 flex items-center gap-1"><ClockIcon className="w-3 h-3"/> Vence em: {new Date(task.dueDate + 'T00:00').toLocaleDateString('pt-BR')}</p>}
                                                            {task.linkedAdminStageId && (() => {
                                                                const linkedStage = projectToView.adminStages.find(s => s.id === task.linkedAdminStageId);
                                                                return linkedStage ? (
                                                                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded inline-block">
                                                                        🔗 {linkedStage.order}. {linkedStage.name}
                                                                    </p>
                                                                ) : null;
                                                            })()}
                                                            <button onClick={() => handleOpenEditTaskModal(task)} className="text-xs text-brand-blue hover:underline mt-2">Editar</button>
                                                        </div>
                                                        <div className="opacity-0 group-hover:opacity-100 text-brand-gray-400">
                                                            <GripVerticalIcon className="w-5 h-5" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button onClick={() => handleOpenAddTaskModal(status)} className="mt-4 w-full text-sm font-semibold text-brand-gray-600 hover:bg-brand-gray-200 p-2 rounded-md">+ Adicionar Tarefa</button>
                                        </div>
                                    ))}
                                </div>
                           )}
                           {viewModalActiveTab === 'adminStages' && (
                               <div className="space-y-4">
                                   <div className="bg-white p-6 rounded-lg shadow-sm">
                                       <div className="flex items-center justify-between mb-6">
                                           <h4 className="text-lg font-semibold text-brand-gray-800 flex items-center gap-2">
                                               <span className="text-2xl">📊</span>
                                               Etapas Administrativas do Projeto
                                           </h4>
                                           <div className="text-sm text-brand-gray-600">
                                               <span className="font-semibold">{projectToView.adminStages.filter(s => s.status === 'completed').length}</span> de {projectToView.adminStages.length} concluídas
                                           </div>
                                       </div>

                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                           {projectToView.adminStages.sort((a, b) => a.order - b.order).map(stage => {
                                               const now = new Date();
                                               const deadline = new Date(stage.extendedDeadline || stage.deadline);
                                               const timeRemaining = deadline.getTime() - now.getTime();
                                               const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
                                               const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
                                               const isOverdue = timeRemaining < 0 && stage.status !== 'completed';
                                               const isCompleted = stage.status === 'completed';
                                               
                                               let statusColor = 'bg-yellow-100 border-yellow-300 text-yellow-800';
                                               let statusIcon = '⏳';
                                               if (isCompleted) {
                                                   statusColor = 'bg-green-100 border-green-300 text-green-800';
                                                   statusIcon = '✅';
                                               } else if (isOverdue) {
                                                   statusColor = 'bg-red-100 border-red-300 text-red-800';
                                                   statusIcon = '⚠️';
                                               }

                                               return (
                                                   <div key={stage.id} className={`border-2 rounded-lg p-4 transition-all ${statusColor}`}>
                                                       <div className="flex items-start justify-between mb-2">
                                                           <div className="flex items-center gap-2">
                                                               <span className="text-xl">{statusIcon}</span>
                                                               <div>
                                                                   <h5 className="font-semibold">{stage.order}. {stage.name}</h5>
                                                                   {isCompleted && stage.completedAt && (
                                                                       <p className="text-xs mt-1">Concluída em: {new Date(stage.completedAt).toLocaleDateString('pt-BR')} às {new Date(stage.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                                                   )}
                                                               </div>
                                                           </div>
                                                           {!isCompleted && (
                                                               <label className="flex items-center cursor-pointer">
                                                                   <input
                                                                       type="checkbox"
                                                                       checked={false}
                                                                       onChange={() => handleCompleteAdminStage(stage.id)}
                                                                       className="w-5 h-5 rounded border-2 border-current cursor-pointer"
                                                                       title="Marcar como concluída"
                                                                   />
                                                               </label>
                                                           )}
                                                       </div>

                                                       {!isCompleted && (
                                                           <div className="space-y-2 mt-3">
                                                               <div className="flex items-center justify-between text-xs">
                                                                   <span className="font-medium">
                                                                       {isOverdue ? (
                                                                           <span className="text-red-700 font-bold">⏰ ATRASADA!</span>
                                                                       ) : (
                                                                           <span>⏰ Tempo restante:</span>
                                                                       )}
                                                                   </span>
                                                                   <span className={`font-bold ${isOverdue ? 'text-red-700' : ''}`}>
                                                                       {isOverdue ? `${Math.abs(hoursRemaining)}h ${Math.abs(minutesRemaining)}min de atraso` : `${hoursRemaining}h ${minutesRemaining}min`}
                                                                   </span>
                                                               </div>
                                                               <div className="flex items-center justify-between text-xs">
                                                                   <span className="font-medium">Prazo:</span>
                                                                   <span>{deadline.toLocaleDateString('pt-BR')} às {deadline.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                               </div>
                                                               {stage.extendedDeadline && stage.extensionReason && (
                                                                   <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs">
                                                                       <p className="font-semibold">Prazo Estendido:</p>
                                                                       <p className="italic">{stage.extensionReason}</p>
                                                                   </div>
                                                               )}
                                                               <button
                                                                   onClick={() => handleOpenExtendDeadlineModal(projectToView.id, stage.id, stage.name)}
                                                                   className="mt-2 w-full px-3 py-1.5 bg-white bg-opacity-70 hover:bg-opacity-100 rounded text-xs font-semibold transition-colors"
                                                               >
                                                                   🔧 Estender Prazo
                                                               </button>
                                                           </div>
                                                       )}
                                                   </div>
                                               );
                                           })}
                                       </div>
                                   </div>
                               </div>
                           )}
                           {viewModalActiveTab === 'qc' && (
                               <div className="bg-white p-6 rounded-lg shadow-sm">
                                   <h4 className="text-lg font-semibold text-brand-gray-800 mb-4">Controle de Qualidade</h4>
                                   <div className="space-y-3">
                                       {projectToView.qualityChecks.map(qc => (
                                           <div key={qc.id} className="p-3 bg-brand-gray-50 rounded-lg flex justify-between items-center">
                                               <div>
                                                   <p className="font-medium text-brand-gray-800">{qc.description}</p>
                                                   <p className="text-xs text-brand-gray-500">{qc.notes || 'Sem observações'}</p>
                                               </div>
                                               <div className="flex items-center gap-2">
                                                   {qc.status === QCCheckStatus.Pendente ? (
                                                       <>
                                                           <button onClick={() => handleUpdateQcStatus(qc.id, QCCheckStatus.Aprovado)} className="p-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200"><CheckCircleIcon className="w-5 h-5"/></button>
                                                           <button onClick={() => handleUpdateQcStatus(qc.id, QCCheckStatus.Reprovado)} className="p-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200"><XCircleIcon className="w-5 h-5"/></button>
                                                       </>
                                                   ) : (
                                                       <span className={`text-sm font-semibold ${qc.status === QCCheckStatus.Aprovado ? 'text-green-600' : 'text-red-600'}`}>{qc.status}</span>
                                                   )}
                                               </div>
                                           </div>
                                       ))}
                                   </div>
                               </div>
                           )}
                        </div>

                        <div className="p-4 bg-white border-t border-brand-gray-200 flex justify-between items-center flex-shrink-0">
                           {(projectToView.projectType === ProjectType.CompletoComObra || projectToView.projectType === ProjectType.Montagem) && projectToView.obraStarted !== true ? (
                                <button
                                    onClick={() => handleStartObra(projectToView.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 transition-colors"
                                >
                                    <BuildingOfficeIcon className="w-5 h-5" />
                                    Gerar Obra
                                </button>
                            ) : (
                                <div />
                            )}
                            <button onClick={handleCloseViewModal} className="px-4 py-2 bg-brand-gray-100 text-brand-gray-800 font-semibold rounded-lg hover:bg-brand-gray-200">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {isTaskModalOpen && projectToView && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 animate-fadeIn">
                     <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-scaleIn">
                        {/* Header com cor S3E */}
                        <div className="bg-gradient-to-r from-brand-s3e to-[#0d2847] p-6 rounded-t-xl">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="text-2xl">📝</span>
                                {taskToEdit ? 'Editar Tarefa' : 'Adicionar Nova Tarefa'}
                            </h3>
                            <p className="text-blue-100 text-sm mt-1">Tarefa do Kanban de Engenharia</p>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-gray-700 mb-2">Título da Tarefa</label>
                                <input 
                                    type="text" 
                                    value={taskForm.title} 
                                    onChange={e => setTaskForm({...taskForm, title: e.target.value})} 
                                    className="w-full px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-s3e focus:border-transparent" 
                                    placeholder="Ex: Revisar projeto elétrico"
                                    required 
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700 mb-2">Status</label>
                                    <select 
                                        value={taskForm.status} 
                                        onChange={e => setTaskForm({...taskForm, status: e.target.value as ProjectStageStatus})} 
                                        className="w-full px-4 py-2 border border-brand-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-s3e focus:border-transparent"
                                    >
                                        {Object.values(ProjectStageStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700 mb-2">Prazo</label>
                                    <input 
                                        type="date" 
                                        value={taskForm.dueDate} 
                                        onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} 
                                        className="w-full px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-s3e focus:border-transparent" 
                                    />
                                </div>
                            </div>

                            {/* Campo de Vínculo com Etapa Administrativa */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <label className="block text-sm font-semibold text-brand-gray-700 mb-2 flex items-center gap-2">
                                    <span className="text-lg">🔗</span>
                                    Vincular à Etapa Administrativa
                                    <span className="text-xs text-brand-gray-400 ml-auto">(Opcional)</span>
                                </label>
                                <select
                                    value={taskForm.linkedAdminStageId || ''}
                                    onChange={e => setTaskForm({...taskForm, linkedAdminStageId: e.target.value || undefined})}
                                    className="w-full px-4 py-2 border border-brand-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-s3e focus:border-transparent"
                                >
                                    <option value="">Nenhuma etapa vinculada</option>
                                    {projectToView.adminStages.sort((a, b) => a.order - b.order).map(stage => (
                                        <option key={stage.id} value={stage.id}>
                                            {stage.order}. {stage.name} {stage.status === AdminStageStatus.Completed ? '✅' : ''}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-brand-gray-500 mt-2">
                                    💡 Vincule esta task a uma etapa administrativa para melhor rastreabilidade
                                </p>
                            </div>
                        </div>
                        
                        <div className="p-6 bg-brand-gray-50 border-t flex justify-end gap-3">
                            <button 
                                type="button" 
                                onClick={handleCloseTaskModal} 
                                className="px-6 py-2 bg-white border border-brand-gray-300 rounded-lg font-semibold hover:bg-brand-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button" 
                                onClick={handleSaveTask} 
                                className="px-6 py-2 bg-brand-s3e text-white rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
                            >
                                Salvar Tarefa
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Team Management Modal - MELHORADO */}
            {isTeamManagementModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col animate-slideUp">
                        {/* Header com cor S3E */}
                        <div className="relative p-6 bg-gradient-to-r from-brand-s3e to-[#0d2847] text-white rounded-t-2xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1 flex items-center gap-3">
                                        <span className="text-2xl">{teamManagementMode === 'view' ? '👥' : (memberToEdit ? '✏️' : '➕')}</span>
                                        {teamManagementMode === 'view' ? 'Gerenciar Equipe' : (memberToEdit ? 'Editar Membro' : 'Adicionar Membro')}
                                    </h2>
                                    <p className="text-blue-100 text-sm">
                                        {teamManagementMode === 'view' ? `${teamMembers.length} membros na equipe` : 'Preencha as informações do membro'}
                                    </p>
                                </div>
                                <button type="button" onClick={closeTeamModal} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                       
                        {teamManagementMode === 'view' && (
                            <div className="p-6 overflow-y-auto flex-grow">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <UserIcon className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-brand-gray-800">Membros da Equipe</h3>
                                            <p className="text-sm text-brand-gray-500">Gerencie os membros do seu projeto</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleOpenAddMember} 
                                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-s3e text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:bg-opacity-90 transform hover:-translate-y-0.5 transition-all"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                        Adicionar Membro
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {teamMembers.map(user => (
                                        <div key={user.id} className="group bg-gradient-to-br from-white to-gray-50 rounded-xl p-4 border-2 border-brand-gray-100 hover:border-purple-200 hover:shadow-lg transition-all">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center font-bold text-white text-lg shadow-md">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-brand-gray-800 text-lg">{user.name}</div>
                                                        <div className="text-sm text-brand-gray-500 flex items-center gap-1">
                                                            📧 {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-brand-gray-100">
                                                <span className={`px-3 py-1.5 inline-flex text-xs font-bold rounded-lg ${getRoleClass(user.role)}`}>
                                                    {user.role}
                                                </span>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => handleOpenEditMember(user)} 
                                                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" 
                                                        title="Editar"
                                                    >
                                                        <PencilIcon className="w-4 h-4"/>
                                                    </button>
                                                    <button 
                                                        onClick={() => setMemberToDelete(user)} 
                                                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" 
                                                        title="Excluir"
                                                    >
                                                        <TrashIcon className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {teamMembers.length === 0 && (
                                    <div className="text-center py-12">
                                        <div className="w-20 h-20 bg-brand-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <ClientsIcon className="w-10 h-10 text-brand-gray-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-brand-gray-700 mb-2">Nenhum membro cadastrado</h3>
                                        <p className="text-sm text-brand-gray-500 mb-4">Adicione membros para começar a gerenciar sua equipe</p>
                                        <button 
                                            onClick={handleOpenAddMember} 
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg hover:bg-brand-blue/90 transition-colors"
                                        >
                                            <PlusIcon className="w-5 h-5" />
                                            Adicionar Primeiro Membro
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {(teamManagementMode === 'add' || teamManagementMode === 'edit') && (
                             <form onSubmit={handleMemberFormSubmit} className="flex flex-col flex-grow">
                                <div className="p-6 space-y-6 flex-grow overflow-y-auto">
                                    {/* Seção: Informações Pessoais */}
                                    <div className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl border border-purple-100">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-2 bg-purple-600 rounded-lg">
                                                <UserIcon className="w-5 h-5 text-white" />
                                            </div>
                                            <h3 className="text-lg font-bold text-brand-gray-800">Informações Pessoais</h3>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-brand-gray-700 mb-2 flex items-center gap-2">
                                                    <span className="text-purple-600">●</span>
                                                    Nome Completo
                                                </label>
                                                <input 
                                                    type="text" 
                                                    value={memberForm.name} 
                                                    onChange={e => setMemberForm({...memberForm, name: e.target.value})} 
                                                    className="w-full px-4 py-3 border-2 border-brand-gray-200 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all" 
                                                    placeholder="Ex: João Silva Santos"
                                                    required 
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-brand-gray-700 mb-2 flex items-center gap-2">
                                                    <span className="text-purple-600">●</span>
                                                    Email Profissional
                                                </label>
                                                <input 
                                                    type="email" 
                                                    value={memberForm.email} 
                                                    onChange={e => setMemberForm({...memberForm, email: e.target.value})} 
                                                    className="w-full px-4 py-3 border-2 border-brand-gray-200 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all" 
                                                    placeholder="Ex: joao.silva@s3e.com"
                                                    required 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Seção: Função e Permissões */}
                                    <div className="bg-gradient-to-br from-pink-50 to-white p-5 rounded-xl border border-pink-100">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-2 bg-pink-600 rounded-lg">
                                                <CheckBadgeIcon className="w-5 h-5 text-white" />
                                            </div>
                                            <h3 className="text-lg font-bold text-brand-gray-800">Função e Permissões</h3>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-brand-gray-700 mb-2 flex items-center gap-2">
                                                <span className="text-pink-600">●</span>
                                                Função no Projeto
                                            </label>
                                            <select 
                                                value={memberForm.role} 
                                                onChange={e => setMemberForm({...memberForm, role: e.target.value as UserRole})} 
                                                className="w-full px-4 py-3 border-2 border-brand-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-pink-600 focus:border-pink-600 transition-all"
                                            >
                                                {Object.values(UserRole).map(role => (
                                                    <option key={role} value={role}>{role}</option>
                                                ))}
                                            </select>
                                            <p className="mt-2 text-xs text-brand-gray-500">
                                                💡 Selecione a função que melhor descreve o papel deste membro no projeto
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-6 bg-brand-gray-50 border-t border-brand-gray-200 rounded-b-2xl flex justify-between items-center">
                                    <div className="text-sm text-brand-gray-500">
                                        <span className="text-red-500">*</span> Campos obrigatórios
                                    </div>
                                    <div className="flex gap-3">
                                        <button 
                                            type="button" 
                                            onClick={() => setTeamManagementMode('view')} 
                                            className="px-6 py-2.5 bg-white border-2 border-brand-gray-300 rounded-lg font-semibold text-brand-gray-700 hover:bg-brand-gray-50 hover:border-brand-gray-400 transition-all"
                                        >
                                            ← Voltar
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="px-6 py-2.5 bg-brand-s3e text-white rounded-lg font-semibold hover:bg-opacity-90 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                        >
                                            <span className="text-lg">{memberToEdit ? '💾' : '✨'}</span>
                                            {memberToEdit ? 'Salvar Alterações' : 'Criar Membro'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {memberToDelete && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
                     <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
                        <div className="p-6">
                            <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
                            <p className="text-sm mt-2 text-brand-gray-600">Tem certeza que deseja excluir o membro da equipe <strong>{memberToDelete.name}</strong>?</p>
                        </div>
                        <div className="p-4 bg-brand-gray-50 border-t flex justify-end gap-3">
                            <button onClick={() => setMemberToDelete(null)} className="px-4 py-2 bg-white border rounded-lg font-semibold">Cancelar</button>
                            <button onClick={handleConfirmDeleteMember} className="px-4 py-2 bg-brand-red text-white rounded-lg font-semibold">Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Extend Deadline Modal */}
            {isExtendDeadlineModalOpen && stageToExtend && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4 animate-fadeIn">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-scaleIn">
                        <div className="bg-gradient-to-r from-brand-s3e to-[#0d2847] p-6 rounded-t-xl">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="text-2xl">⏰</span>
                                Estender Prazo da Etapa
                            </h3>
                            <p className="text-blue-100 text-sm mt-1">{stageToExtend.stageName}</p>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800">
                                    <strong>Atenção:</strong> A extensão de prazo deve ser justificada por motivos válidos (imprevisto, mudança de escopo, etc.).
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-brand-gray-700 mb-2">
                                    Horas Adicionais
                                </label>
                                <select
                                    value={extensionHours}
                                    onChange={(e) => setExtensionHours(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-s3e focus:border-transparent"
                                >
                                    <option value={6}>6 horas</option>
                                    <option value={12}>12 horas</option>
                                    <option value={24}>24 horas (1 dia)</option>
                                    <option value={48}>48 horas (2 dias)</option>
                                    <option value={72}>72 horas (3 dias)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-brand-gray-700 mb-2">
                                    Justificativa <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={extensionReason}
                                    onChange={(e) => setExtensionReason(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-brand-s3e focus:border-transparent resize-none"
                                    placeholder="Descreva o motivo da extensão de prazo (obrigatório)..."
                                    required
                                />
                                <p className="text-xs text-brand-gray-500 mt-1">
                                    Mínimo 10 caracteres
                                </p>
                            </div>
                        </div>

                        <div className="p-6 bg-brand-gray-50 border-t flex justify-end gap-3">
                            <button
                                onClick={handleCloseExtendDeadlineModal}
                                className="px-6 py-2 bg-white border border-brand-gray-300 rounded-lg font-semibold hover:bg-brand-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmExtendDeadline}
                                disabled={extensionReason.trim().length < 10}
                                className="px-6 py-2 bg-brand-s3e text-white rounded-lg font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirmar Extensão
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projetos;