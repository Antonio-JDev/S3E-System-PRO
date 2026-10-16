import React, { useState, useMemo, useRef, useEffect, useContext } from 'react';
import { type StockMovement, MovementType, type MaterialItem } from '../types';
import { movimentacoesService } from '../services/movimentacoesService';
import { toast } from 'sonner';
import { useSKey } from '../hooks/useSKey';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { AuthContext } from '../contexts/AuthContext';
import { projetosService } from '../services/projetosService';
import { useEstoqueMovimentacoes, useInvalidateEstoqueMovimentacoes } from '../hooks/useEstoqueQuery';
import ScrollableRow from './ui/ScrollableRow';
import { scrollableNavItemClasses } from '../utils/responsiveNav';

// ==================== ICONS ====================
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
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
const MagnifyingGlassIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.038-2.124H9.038c-1.128 0-2.038.944-2.038 2.124v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const MOTIVO_DEVOLUCAO_OS = "Devolução de OS";
const MOTIVOS_SAIDA_COM_OS = ["Alocação para OS", "Uso em Instalação", "Aplicação em Serviço"];

type OsBusca = {
    id: string;
    titulo: string;
    numeroOs?: string | null;
    status: string;
    cliente?: { nome: string } | null;
    obra?: { id: string; nomeObra: string; status: string } | null;
};

const rotuloOs = (os: OsBusca) =>
    `${os.numeroOs ? `${os.numeroOs} · ` : ''}${os.titulo}${os.cliente?.nome ? ` · ${os.cliente.nome}` : ''}`;

const TEMA_MODAL = {
    [MovementType.Entrada]: {
        header: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/20',
        icone: 'from-green-600 to-green-700 ring-green-100 dark:ring-green-900/60',
        foco: 'focus:ring-green-500 focus:border-green-500 dark:focus:ring-green-500/30 dark:focus:border-green-500',
        selecionado: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300',
        hoverItem: 'hover:bg-green-50 dark:hover:bg-green-900/20',
        botao: 'from-green-600 to-green-500 hover:from-green-700 hover:to-green-600',
    },
    [MovementType.Saida]: {
        header: 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/40 dark:to-red-950/20',
        icone: 'from-orange-600 to-orange-700 ring-orange-100 dark:ring-orange-900/60',
        foco: 'focus:ring-orange-500 focus:border-orange-500 dark:focus:ring-orange-500/30 dark:focus:border-orange-500',
        selecionado: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300',
        hoverItem: 'hover:bg-orange-50 dark:hover:bg-orange-900/20',
        botao: 'from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600',
    },
} as const;

const entryReasons = [
    MOTIVO_DEVOLUCAO_OS,
    "Devolução de Cliente",
    "Sobra de Projeto",
    "Material em Excesso",
    "Troca de Fornecedor",
    "Ajuste de Inventário",
    "Outro",
];

const exitReasons = [
    ...MOTIVOS_SAIDA_COM_OS,
    "Perda ou Avaria",
    "Furto/Roubo",
    "Material com Defeito",
    "Ajuste de Inventário",
    "Outro",
];

const getTypeClass = (type: MovementType) => {
    switch (type) {
        case MovementType.Entrada: return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 ring-1 ring-green-200 dark:ring-green-800';
        case MovementType.Saida: return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 ring-1 ring-orange-200 dark:ring-orange-800';
        case MovementType.Ajuste: return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800';
        default: return 'bg-gray-100 dark:bg-dark-card text-gray-800 dark:text-dark-text ring-1 ring-gray-200 dark:ring-dark-border';
    }
};

const getTypeIcon = (type: MovementType) => {
    switch (type) {
        case MovementType.Entrada: return '📥';
        case MovementType.Saida: return '📤';
        case MovementType.Ajuste: return '📋';
        default: return '📦';
    }
};

const getTypeLabel = (type: MovementType) => {
    switch (type) {
        case MovementType.Entrada: return 'Entrada';
        case MovementType.Saida: return 'Saída';
        case MovementType.Ajuste: return 'Ajuste';
        default: return String(type);
    }
};

interface MovimentacoesProps {
    toggleSidebar: () => void;
}

const Movimentacoes: React.FC<MovimentacoesProps> = ({ toggleSidebar }) => {
    const authContext = useContext(AuthContext);
    const userRole = authContext?.user?.role?.toLowerCase() || '';
    const user = authContext?.user;
    const isAdminOrDeveloper = userRole === 'admin' || userRole === 'desenvolvedor' || user?.isAdmin === true;
    
    const {
        data: movQueryData,
        isLoading: loading,
        error: movQueryError,
        refetch: refetchMovimentacoes,
    } = useEstoqueMovimentacoes();
    const invalidateMovimentacoes = useInvalidateEstoqueMovimentacoes();
    const movements = (movQueryData?.movements ?? []) as StockMovement[];
    const materials = (movQueryData?.materials ?? []) as MaterialItem[];
    const error = movQueryError
        ? movQueryError instanceof Error
            ? movQueryError.message
            : 'Erro ao carregar movimentações'
        : null;
    const [filter, setFilter] = useState<MovementType | 'Todos'>('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    
    const [isEntradaModalOpen, setIsEntradaModalOpen] = useState(false);
    const [isSaidaModalOpen, setIsSaidaModalOpen] = useState(false);
    const [movimentacaoToDelete, setMovimentacaoToDelete] = useState<StockMovement | null>(null);
    
    // Form state
    const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
    const [materialSearchTerm, setMaterialSearchTerm] = useState('');
    const [isMaterialListOpen, setIsMaterialListOpen] = useState(false);
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [responsible, setResponsible] = useState('Admin');
    const [notes, setNotes] = useState('');
    const [dataMovimentacao, setDataMovimentacao] = useState(new Date().toISOString().split('T')[0]);
    const [osSelecionada, setOsSelecionada] = useState<OsBusca | null>(null);
    const [osBusca, setOsBusca] = useState('');
    const [osOpcoes, setOsOpcoes] = useState<OsBusca[]>([]);
    const [isOsListOpen, setIsOsListOpen] = useState(false);
    const [buscandoOs, setBuscandoOs] = useState(false);
    
    const materialDropdownRef = useRef<HTMLDivElement>(null);
    const osDropdownRef = useRef<HTMLDivElement>(null);

    // Carregar dados da API (React Query)
    const loadData = async () => {
        await invalidateMovimentacoes();
        await refetchMovimentacoes();
    };

    useEffect(() => {
        if (osSelecionada) return;
        const termo = osBusca.trim();
        if (termo.length < 1) {
            setOsOpcoes([]);
            return;
        }
        let cancelado = false;
        const t = window.setTimeout(async () => {
            setBuscandoOs(true);
            try {
                const res = await projetosService.buscarPorTermo(termo, 20);
                if (!cancelado) setOsOpcoes(res.success && Array.isArray(res.data) ? res.data : []);
            } finally {
                if (!cancelado) setBuscandoOs(false);
            }
        }, 300);
        return () => {
            cancelado = true;
            window.clearTimeout(t);
        };
    }, [osBusca, osSelecionada]);

    useEffect(() => {
        if (!isMaterialListOpen && !isOsListOpen) return;
        const fecharAoClicarFora = (e: MouseEvent) => {
            const alvo = e.target as Node;
            if (materialDropdownRef.current && !materialDropdownRef.current.contains(alvo)) setIsMaterialListOpen(false);
            if (osDropdownRef.current && !osDropdownRef.current.contains(alvo)) setIsOsListOpen(false);
        };
        document.addEventListener('mousedown', fecharAoClicarFora);
        return () => document.removeEventListener('mousedown', fecharAoClicarFora);
    }, [isMaterialListOpen, isOsListOpen]);

    // Filtros
    const filteredMovements = useMemo(() => {
        let filtered = movements;

        // Filtro por tipo
        if (filter !== 'Todos') {
            filtered = filtered.filter(movement => movement.type === filter);
        }

        // Filtro por busca
        if (searchTerm) {
            filtered = filtered.filter(movement =>
                (movement.materialName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (movement.reason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (movement.responsible || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filtro por data
        if (dateFilter) {
            filtered = filtered.filter(movement =>
                movement.date.startsWith(dateFilter)
            );
        }

        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [movements, filter, searchTerm, dateFilter]);

    // Estatísticas
    const stats = useMemo(() => {
        const totalMovimentos = movements.length;
        const entradas = movements.filter(m => m.type === MovementType.Entrada).length;
        const saidas = movements.filter(m => m.type === MovementType.Saida).length;
        const movimentosHoje = movements.filter(m => {
            const hoje = new Date().toISOString().split('T')[0];
            return m.date.startsWith(hoje);
        }).length;

        return { totalMovimentos, entradas, saidas, movimentosHoje };
    }, [movements]);

    // Filtrar materiais para seleção
    const filteredMaterials = useMemo(() => {
        return materials.filter(material =>
            material.name.toLowerCase().includes(materialSearchTerm.toLowerCase()) ||
            material.sku.toLowerCase().includes(materialSearchTerm.toLowerCase())
        );
    }, [materials, materialSearchTerm]);

    // Handlers
    const resetForm = () => {
        setSelectedMaterial(null);
        setMaterialSearchTerm('');
        setQuantity('');
        setReason('');
        setNotes('');
        setDataMovimentacao(new Date().toISOString().split('T')[0]);
        setOsSelecionada(null);
        setOsBusca('');
        setOsOpcoes([]);
        setIsOsListOpen(false);
        setIsMaterialListOpen(false);
    };

    const exigeOs = (type: MovementType, motivo: string) =>
        type === MovementType.Entrada ? motivo === MOTIVO_DEVOLUCAO_OS : MOTIVOS_SAIDA_COM_OS.includes(motivo);

    const handleDeleteMovimentacao = async () => {
        if (!movimentacaoToDelete) return;

        try {
            const response = await movimentacoesService.deletar(movimentacaoToDelete.id);
            
            if (response.success) {
                toast.success('✅ Movimentação excluída com sucesso!', {
                    description: 'O estoque foi revertido automaticamente'
                });
                setMovimentacaoToDelete(null);
                await loadData(); // Recarregar lista
            } else {
                toast.error(`❌ Erro ao excluir movimentação: ${response.error || 'Erro desconhecido'}`);
            }
        } catch (error: any) {
            console.error('Erro ao excluir movimentação:', error);
            toast.error('❌ Erro ao excluir movimentação. Verifique o console para mais detalhes.');
        }
    };

    const handleSubmitMovement = async (type: MovementType) => {
        if (!selectedMaterial || !quantity || !reason) {
            toast.error('❌ Campos obrigatórios não preenchidos', {
                description: 'Selecione o material, quantidade e motivo.'
            });
            return;
        }

        if (type === MovementType.Saida && exigeOs(type, reason) && !osSelecionada) {
            toast.error('❌ Selecione a OS de destino', {
                description: 'Busque pelo número da OS, título ou cliente.'
            });
            return;
        }

        try {
            const quantidadeNum = parseFloat(quantity);
            if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
                toast.error('❌ Quantidade inválida', {
                    description: 'Informe uma quantidade maior que zero.'
                });
                return;
            }

            const osDaMovimentacao = exigeOs(type, reason) ? osSelecionada : null;
            const observacoes = osDaMovimentacao
                ? `${osDaMovimentacao.numeroOs || 'OS'} · ${osDaMovimentacao.titulo}${notes.trim() ? ` — ${notes.trim()}` : ''}`
                : notes || undefined;

            const movimentacaoData = {
                materialId: selectedMaterial.id,
                tipo: type === MovementType.Entrada ? 'ENTRADA' : 'SAIDA' as 'ENTRADA' | 'SAIDA',
                quantidade: quantidadeNum,
                motivo: reason,
                observacoes,
                // Relatórios de material por obra filtram por referencia = obraId
                referencia: osDaMovimentacao ? osDaMovimentacao.obra?.id || osDaMovimentacao.id : undefined
            };

            const response = await movimentacoesService.criar(movimentacaoData);
            
            if (response.success && response.data) {
                toast.success(`✅ ${type === MovementType.Entrada ? 'Entrada' : 'Saída'} registrada com sucesso!`, {
                    description: `${selectedMaterial.name} - ${quantidadeNum} unidades`
                });
                resetForm();
                setIsEntradaModalOpen(false);
                setIsSaidaModalOpen(false);
                await loadData();
            } else {
                toast.error('❌ Erro ao registrar movimentação', {
                    description: response.error || 'Erro desconhecido.'
                });
            }
        } catch (error) {
            console.error('Erro ao registrar movimentação:', error);
            toast.error('❌ Erro ao registrar movimentação', {
                description: 'Verifique sua conexão e tente novamente.'
            });
        }
    };

    // Fechar modais com ESC
    useEscapeKey(isEntradaModalOpen, () => {
        setIsEntradaModalOpen(false);
        resetForm();
    });
    useEscapeKey(isSaidaModalOpen, () => {
        setIsSaidaModalOpen(false);
        resetForm();
    });
    
    // Fechar modais com tecla S
    useSKey(isEntradaModalOpen, () => {
        setIsEntradaModalOpen(false);
        resetForm();
    });
    useSKey(isSaidaModalOpen, () => {
        setIsSaidaModalOpen(false);
        resetForm();
    });

    const renderModalMovimentacao = (type: MovementType.Entrada | MovementType.Saida) => {
        const entrada = type === MovementType.Entrada;
        const tema = TEMA_MODAL[type];
        const campo = `input-field ${tema.foco}`;
        const label = 'block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2';
        const mostrarOs = exigeOs(type, reason);
        const estoqueInsuficiente = !entrada && !!(selectedMaterial && quantity && parseFloat(quantity) > (selectedMaterial.stock ?? 0));
        const fechar = () => {
            if (entrada) setIsEntradaModalOpen(false);
            else setIsSaidaModalOpen(false);
            resetForm();
        };
        const Icone = entrada ? ArrowDownTrayIcon : ArrowUpTrayIcon;

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="modal-content max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-in-up">
                    <div className={`relative p-6 border-b border-gray-100 dark:border-dark-border rounded-t-xl ${tema.header}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-medium ring-2 ${tema.icone}`}>
                                <Icone className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
                                    {entrada ? 'Devolução de Estoque' : 'Realizar Baixa de Estoque'}
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                                    {entrada ? 'Registrar entrada de material no estoque' : 'Registrar saída de material do estoque'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={fechar}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-dark-text-secondary dark:hover:text-dark-text hover:bg-white/80 dark:hover:bg-dark-hover rounded-xl"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6 space-y-5">
                        <div>
                            <label className={label}>Material/Item *</label>
                            <div className="relative" ref={materialDropdownRef}>
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-dark-text-secondary pointer-events-none" />
                                <input
                                    type="search"
                                    value={selectedMaterial ? `${selectedMaterial.name} (SKU: ${selectedMaterial.sku})` : materialSearchTerm}
                                    onChange={(e) => {
                                        setMaterialSearchTerm(e.target.value);
                                        setIsMaterialListOpen(true);
                                        if (selectedMaterial) setSelectedMaterial(null);
                                    }}
                                    onFocus={() => setIsMaterialListOpen(true)}
                                    placeholder="Digite para buscar material por nome ou SKU..."
                                    className={`${campo} pl-10`}
                                />
                                {isMaterialListOpen && !selectedMaterial && filteredMaterials.length > 0 && (
                                    <div className="absolute z-20 w-full mt-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                        {filteredMaterials.slice(0, 50).map((material) => (
                                            <button
                                                key={material.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedMaterial(material);
                                                    setIsMaterialListOpen(false);
                                                    setMaterialSearchTerm('');
                                                }}
                                                className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-dark-border last:border-0 ${tema.hoverItem}`}
                                            >
                                                <p className="font-semibold text-gray-900 dark:text-dark-text">{material.name}</p>
                                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">SKU: {material.sku} | Estoque: {material.stock}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {selectedMaterial && (
                                <div className={`mt-2 p-3 border rounded-lg ${tema.selecionado}`}>
                                    <p className="text-sm">
                                        <strong>Selecionado:</strong> {selectedMaterial.name} | Estoque atual: {selectedMaterial.stock} unidades
                                    </p>
                                    {!entrada && (selectedMaterial.stock ?? 0) <= 0 && (
                                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">
                                            ⚠️ Atenção: Estoque atual está zerado!
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className={label}>Quantidade *</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                min="1"
                                max={entrada ? undefined : selectedMaterial?.stock || 999999}
                                step="1"
                                placeholder={entrada ? 'Ex: 10' : 'Ex: 5'}
                                className={campo}
                            />
                            {!entrada && selectedMaterial && (
                                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">
                                    Disponível em estoque: {selectedMaterial.stock} unidades
                                </p>
                            )}
                        </div>

                        <div>
                            <label className={label}>{entrada ? 'Motivo da Devolução *' : 'Motivo da Baixa *'}</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className={`select-field ${tema.foco}`}
                            >
                                <option value="">Selecione o motivo</option>
                                {(entrada ? entryReasons : exitReasons).map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        {mostrarOs && (
                            <div>
                                <label className={label}>{entrada ? 'OS de Origem' : 'OS de Destino *'}</label>
                                <div className="relative" ref={osDropdownRef}>
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-dark-text-secondary pointer-events-none" />
                                    <input
                                        type="search"
                                        value={osSelecionada ? rotuloOs(osSelecionada) : osBusca}
                                        onChange={(e) => {
                                            setOsBusca(e.target.value);
                                            setIsOsListOpen(true);
                                            if (osSelecionada) setOsSelecionada(null);
                                        }}
                                        onFocus={() => setIsOsListOpen(true)}
                                        placeholder="Buscar OS por número, título ou cliente..."
                                        className={`${campo} pl-10`}
                                    />
                                    {isOsListOpen && !osSelecionada && osBusca.trim() && (
                                        <div className="absolute z-20 w-full mt-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                            {buscandoOs ? (
                                                <p className="px-4 py-3 text-sm text-gray-500 dark:text-dark-text-secondary">Buscando…</p>
                                            ) : osOpcoes.length === 0 ? (
                                                <p className="px-4 py-3 text-sm text-gray-500 dark:text-dark-text-secondary">Nenhuma OS encontrada.</p>
                                            ) : (
                                                osOpcoes.map((os) => (
                                                    <button
                                                        key={os.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setOsSelecionada(os);
                                                            setIsOsListOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-dark-border last:border-0 ${tema.hoverItem}`}
                                                    >
                                                        <p className="font-semibold text-gray-900 dark:text-dark-text">
                                                            {os.numeroOs ? `${os.numeroOs} · ` : ''}{os.titulo}
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                                            {os.cliente?.nome || 'Sem cliente'} · {os.status}
                                                            {os.obra ? ` · Obra: ${os.obra.nomeObra}` : ''}
                                                        </p>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className={label}>{entrada ? 'Data da Devolução *' : 'Data da Baixa *'}</label>
                            <input
                                type="date"
                                value={dataMovimentacao}
                                onChange={(e) => setDataMovimentacao(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                className={`${campo} dark:[color-scheme:dark]`}
                            />
                        </div>

                        <div>
                            <label className={label}>Observações</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder={entrada ? 'Informações adicionais sobre a devolução...' : 'Informações adicionais sobre a baixa (ex: descrição do uso...)'}
                                className={`${campo} resize-y`}
                            />
                        </div>

                        {estoqueInsuficiente && (
                            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
                                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                                    ⚠️ ATENÇÃO: Quantidade solicitada maior que o estoque disponível!
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-dark-border">
                            <button onClick={fechar} className="btn-secondary px-6 py-3 rounded-xl">
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleSubmitMovement(type)}
                                disabled={estoqueInsuficiente}
                                className={`px-8 py-3 bg-gradient-to-r text-white rounded-xl transition-all shadow-medium font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${tema.botao}`}
                            >
                                <Icone className="w-5 h-5" />
                                {entrada ? 'Registrar Devolução' : 'Realizar Baixa'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 flex items-center justify-center bg-white dark:bg-dark-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando movimentações...</p>
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
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">Movimentações</h1>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-1">Controle de entradas e saídas de estoque</p>
                    </div>
                </div>
                <ScrollableRow className="w-full sm:w-auto justify-start sm:justify-end">
                    <button
                        onClick={() => setIsEntradaModalOpen(true)}
                        className={`${scrollableNavItemClasses} flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold`}
                    >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Devolução Estoque
                    </button>
                    <button
                        onClick={() => setIsSaidaModalOpen(true)}
                        className={`${scrollableNavItemClasses} flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-medium font-semibold`}
                    >
                        <ArrowUpTrayIcon className="w-5 h-5" />
                        Realizar Baixa Estoque
                    </button>
                </ScrollableRow>
            </header>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-6 animate-fade-in">
                    <p className="text-red-800 dark:text-red-300 font-medium">⚠️ {error}</p>
                </div>
            )}

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card-primary">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/50 dark:to-indigo-800/50 flex items-center justify-center">
                            <ClockIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Total de Movimentos</p>
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalMovimentos}</p>
                        </div>
                    </div>
                </div>

                <div className="card-primary">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 flex items-center justify-center">
                            <ArrowDownTrayIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Entradas</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.entradas}</p>
                        </div>
                    </div>
                </div>

                <div className="card-primary">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 flex items-center justify-center">
                            <ArrowUpTrayIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Saídas</p>
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.saidas}</p>
                        </div>
                    </div>
                </div>

                <div className="card-primary">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 flex items-center justify-center">
                            <span className="text-2xl">📅</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Hoje</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.movimentosHoje}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="card-primary mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-dark-text-secondary" />
                            <input
                                type="text"
                                placeholder="Buscar por material, motivo ou responsável..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-field pl-10"
                            />
                        </div>
                    </div>

                    <div>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as MovementType | 'Todos')}
                            className="select-field"
                        >
                            <option value="Todos">Todos os Tipos</option>
                            <option value={MovementType.Entrada}>Entradas</option>
                            <option value={MovementType.Saida}>Saídas</option>
                            <option value={MovementType.Ajuste}>Ajustes</option>
                        </select>
                    </div>

                    <div>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="input-field"
                        />
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                        Exibindo <span className="font-bold text-gray-900 dark:text-dark-text">{filteredMovements.length}</span> de <span className="font-bold text-gray-900 dark:text-dark-text">{movements.length}</span> movimentações
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-gray-600 dark:text-dark-text-secondary">Entradas: {stats.entradas}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                            <span className="text-xs text-gray-600 dark:text-dark-text-secondary">Saídas: {stats.saidas}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de Movimentações */}
            {filteredMovements.length === 0 ? (
                <div className="card-primary p-16 text-center">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">📦</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2">Nenhuma movimentação encontrada</h3>
                    <p className="text-gray-500 dark:text-dark-text-secondary mb-6">
                        {searchTerm || filter !== 'Todos' || dateFilter
                            ? 'Tente ajustar os filtros de busca'
                            : 'Comece registrando sua primeira movimentação'}
                    </p>
                    {!searchTerm && filter === 'Todos' && !dateFilter && (
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setIsEntradaModalOpen(true)}
                                className="bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-medium font-semibold"
                            >
                                <ArrowDownTrayIcon className="w-5 h-5 inline mr-2" />
                                Primeira Entrada
                            </button>
                            <button
                                onClick={() => setIsSaidaModalOpen(true)}
                                className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-6 py-3 rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-medium font-semibold"
                            >
                                <ArrowUpTrayIcon className="w-5 h-5 inline mr-2" />
                                Primeira Saída
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredMovements.map((movement) => {
                        if (!movement || !movement.id) return null;
                        
                        return (
                            <div key={movement.id} className="card-primary border-2 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-dark-text">{movement.materialName || 'Material'}</h3>
                                            <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${getTypeClass(movement.type)}`}>
                                                {getTypeIcon(movement.type)} {getTypeLabel(movement.type)}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-dark-text-secondary">
                                            <div className="flex items-center gap-2">
                                                <span>📦</span>
                                                <span><strong>Quantidade:</strong> {movement.quantity || 0}</span>
                                            </div>
                                        <div className="flex items-center gap-2">
                                            <span>📝</span>
                                            <span><strong>Motivo:</strong> {movement.reason || 'Não informado'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <UserIcon className="w-4 h-4" />
                                            <span><strong>Por:</strong> {movement.responsible || 'Sistema'}</span>
                                        </div>
                                    </div>
                                    {movement.notes && (
                                        <div className="mt-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                                            <span className="font-medium">Observações:</span> {movement.notes}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-indigo-700 dark:text-indigo-400">
                                            {new Date(movement.date).toLocaleDateString('pt-BR')}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                            {new Date(movement.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    {isAdminOrDeveloper && (
                                        <button
                                            onClick={() => setMovimentacaoToDelete(movement)}
                                            className="btn-action-delete px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                                            title="Excluir movimentação (hard delete)"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                            Excluir
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                </div>
            )}

            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
            {movimentacaoToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-content max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-4">Excluir Movimentação</h3>
                        <p className="text-gray-600 dark:text-dark-text-secondary mb-2">
                            Tem certeza que deseja excluir permanentemente esta movimentação?
                        </p>
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                            <p className="text-sm text-gray-800 dark:text-dark-text">
                                <strong>Material:</strong> {movimentacaoToDelete.materialName}
                            </p>
                            <p className="text-sm text-gray-800 dark:text-dark-text">
                                <strong>Tipo:</strong> {getTypeLabel(movimentacaoToDelete.type)}
                            </p>
                            <p className="text-sm text-gray-800 dark:text-dark-text">
                                <strong>Quantidade:</strong> {movimentacaoToDelete.quantity}
                            </p>
                            <p className="text-sm text-gray-800 dark:text-dark-text">
                                <strong>Data:</strong> {new Date(movimentacaoToDelete.date).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                            <p className="text-sm text-yellow-800 dark:text-yellow-300 font-semibold">
                                ⚠️ ATENÇÃO: Esta ação é irreversível!
                            </p>
                            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                                O estoque será revertido automaticamente (hard delete).
                            </p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setMovimentacaoToDelete(null)}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteMovimentacao}
                                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold"
                            >
                                Excluir Permanentemente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEntradaModalOpen && renderModalMovimentacao(MovementType.Entrada)}

            {isSaidaModalOpen && renderModalMovimentacao(MovementType.Saida)}
        </div>
    );
};

export default Movimentacoes;