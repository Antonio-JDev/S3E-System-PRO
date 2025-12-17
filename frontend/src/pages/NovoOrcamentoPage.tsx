
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { toast } from 'sonner';
import { orcamentosService, type CreateOrcamentoData } from '../services/orcamentosService';
import { clientesService } from '../services/clientesService';
import { empresasService, Empresa } from '../services/empresasService';
import { servicosService, type Servico } from '../services/servicosService';
import { quadrosService } from '../services/quadrosService';
import { axiosApiService } from '../services/axiosApi';
import { ENDPOINTS } from '../config/api';
import JoditEditorComponent from '../components/JoditEditor';
import PrecoValidadeFlag from '../components/PrecoValidadeFlag';
import HistoricoPrecosModal from '../components/HistoricoPrecosModal';
import UnitSelector from '../components/UnitSelector';
import UnitDisplay from '../components/UnitDisplay';
import { identificarTipoMaterial } from '../utils/unitConverter';
import { getUploadUrl } from '../config/api';
import ClienteCombobox from '../components/ui/ClienteCombobox';
import CriarClienteRapidoModal from '../components/ui/CriarClienteRapidoModal';

import { useEscapeKey } from '../hooks/useEscapeKey';
import { AuthContext } from '../contexts/AuthContext';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../components/ui/alert-dialog';

// ==================== ICONS ====================
const ArrowLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
);

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

// Types
interface Cliente {
    id: string;
    nome: string;
    cpfCnpj: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    ativo: boolean;
}

interface Material {
    id: string;
    nome: string;
    sku: string;
    unidadeMedida: string;
    imagemUrl?: string; // Foto do material
    ncm?: string; // Nomenclatura Comum do Mercosul

    preco: number; // Preço de custo
    valorVenda?: number; // Preço de venda (usado em orçamentos)
    porcentagemLucro?: number; // Porcentagem de lucro
    estoque: number;
    categoria: string;
    ativo: boolean;
    ultimaAtualizacaoPreco?: string | null;
}

interface Quadro {
    id: string;
    nome: string;
    descricao: string;
    configuracao: any;
    custoTotal: number;
    precoSugerido: number;
    ativo: boolean;
}

interface Kit {
    id: string;
    nome: string;
    descricao: string;
    items: { materialId: string; quantidade: number }[];
    custoTotal: number;
    precoSugerido: number;
    ativo: boolean;
}

interface OrcamentoItem {
    id?: string;
    tipo: 'MATERIAL' | 'KIT' | 'SERVICO' | 'QUADRO_PRONTO' | 'CUSTO_EXTRA' | 'COTACAO';
    materialId?: string;
    kitId?: string;
    cotacaoId?: string; // Novo: ID da cotação do banco frio
    servicoNome?: string;
    descricao?: string;
    dataAtualizacaoCotacao?: string; // Novo: data da cotação para exibir flag
    nome: string;
    unidadeMedida: string;
    unidadeVenda?: string; // ✅ NOVO: Unidade de venda (pode ser diferente da unidade de estoque)
    tipoMaterial?: 'BARRAMENTO_COBRE' | 'TRILHO_DIN' | 'CABO' | 'PADRAO'; // ✅ NOVO: Tipo para conversão
    ncm?: string; // Nomenclatura Comum do Mercosul (para faturamento NF-e/NFS-e)
    quantidade: number;
    custoUnit: number;
    precoBase?: number; // Preço base sem BDI
    precoUnit: number;
    subtotal: number;
    precoEditadoManual?: boolean; // Flag para indicar se o preço foi editado manualmente
}

interface Foto {
    id?: string;
    url: string;
    legenda: string;
    ordem: number;
    preview?: string;
}

interface NovoOrcamentoPageProps {
    setAbaAtiva: (aba: 'listagem' | 'novo') => void;
    onOrcamentoCriado?: () => void;
}

const NovoOrcamentoPage: React.FC<NovoOrcamentoPageProps> = ({ setAbaAtiva, onOrcamentoCriado }) => {

    const authContext = useContext(AuthContext);
    const userId = authContext?.user?.id || null;
    
    // Função para calcular data padrão de validade (30 dias a partir de hoje)
    const calcularDataValidadePadrao = (): string => {
        const hoje = new Date();
        const dataValidade = new Date(hoje);
        dataValidade.setDate(hoje.getDate() + 30);
        
        // Formatar para YYYY-MM-DD (formato do input type="date")
        const ano = dataValidade.getFullYear();
        const mes = String(dataValidade.getMonth() + 1).padStart(2, '0');
        const dia = String(dataValidade.getDate()).padStart(2, '0');
        
        return `${ano}-${mes}-${dia}`;
    };
    
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [materiais, setMateriais] = useState<Material[]>([]);
    const [servicos, setServicos] = useState<Servico[]>([]);
    const [quadros, setQuadros] = useState<Quadro[]>([]);
    const [kits, setKits] = useState<Kit[]>([]);
    const [cotacoes, setCotacoes] = useState<any[]>([]); // Novo: cotações do banco frio
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    
    // Estados para rascunho
    const [showRascunhoDialog, setShowRascunhoDialog] = useState(false);
    const [rascunhoEncontrado, setRascunhoEncontrado] = useState<any>(null);
    
    // Estado para controlar se está usando endereço do cliente
    const [usandoEnderecoCliente, setUsandoEnderecoCliente] = useState(false);

    // Form state
    const [formState, setFormState] = useState({
        clienteId: '',
        titulo: '',
        descricao: '',
        descricaoProjeto: '',
        validade: calcularDataValidadePadrao(), // Data padrão de 30 dias
        bdi: 20,
        observacoes: '',
        empresaCNPJ: '',
        enderecoObra: '',
        cidade: '',
        bairro: '',
        cep: '',
        responsavelObra: '',
        previsaoInicio: '',
        previsaoTermino: '',
        descontoValor: 0,
        impostoPercentual: 0,
        condicaoPagamento: 'À Vista'
    });

    const [items, setItems] = useState<OrcamentoItem[]>([]);
    const [showItemModal, setShowItemModal] = useState(false);
    const [itemSearchTerm, setItemSearchTerm] = useState('');
    const [modalExpandido, setModalExpandido] = useState(false); // Novo: controla se o modal está expandido
    
    // Estados para comparação estoque vs banco frio
    const [materiaisComEstoque, setMateriaisComEstoque] = useState<Material[]>([]);
    const [cotacoesBancoFrio, setCotacoesBancoFrio] = useState<any[]>([]);
    const [searchEstoque, setSearchEstoque] = useState('');
    const [searchCotacoes, setSearchCotacoes] = useState('');
    const [searchGlobalComparacao, setSearchGlobalComparacao] = useState(''); // Busca global para ambos os painéis
    const [materialSelecionadoComparacao, setMaterialSelecionadoComparacao] = useState<Material | null>(null);
    const [cotacaoSelecionadaComparacao, setCotacaoSelecionadaComparacao] = useState<any | null>(null);
    
    // Estados para seleção múltipla
    const [materiaisSelecionadosComparacao, setMateriaisSelecionadosComparacao] = useState<Set<string>>(new Set());
    const [cotacoesSelecionadasComparacao, setCotacoesSelecionadasComparacao] = useState<Set<string>>(new Set());
    
    // Estado para busca global (todos os tipos de itens)
    const [buscaGlobal, setBuscaGlobal] = useState('');
    const [resultadosBuscaGlobal, setResultadosBuscaGlobal] = useState<{
        materiais: Material[];
        servicos: Servico[];
        kits: Kit[];
        quadros: Quadro[];
        cotacoes: any[];
    }>({
        materiais: [],
        servicos: [],
        kits: [],
        quadros: [],
        cotacoes: []
    });
    
    // Estado para modo de adição (com novas opções)
    const [modoAdicao, setModoAdicao] = useState<'materiais' | 'servicos' | 'kits' | 'quadros' | 'cotacoes' | 'manual' | 'comparacao'>('materiais');
    const [novoItemManual, setNovoItemManual] = useState({
        nome: '',
        descricao: '',
        unidadeMedida: 'UN',
        quantidade: 1,
        custoUnit: 0,
        tipo: 'MATERIAL' as const
    });

    // Estados para cliente rápido
    const [showClienteRapidoModal, setShowClienteRapidoModal] = useState(false);
    const [criandoClienteRapido, setCriandoClienteRapido] = useState(false);


    // Funções para gerenciar rascunho
    const getRascunhoKey = () => {
        if (!userId) return null;
        return `orcamento_rascunho_${userId}`;
    };

    const salvarRascunho = () => {
        const rascunhoKey = getRascunhoKey();
        if (!rascunhoKey) {
            toast.error('Usuário não autenticado', {
                description: 'Não é possível salvar rascunho sem estar logado'
            });
            return;
        }

        try {
            const rascunho = {
                formState,
                items,
                dataSalvamento: new Date().toISOString()
            };
            
            localStorage.setItem(rascunhoKey, JSON.stringify(rascunho));
            toast.success('Rascunho salvo com sucesso!', {
                description: 'Seus dados foram salvos localmente'
            });
        } catch (error) {
            console.error('Erro ao salvar rascunho:', error);
            toast.error('Erro ao salvar rascunho', {
                description: 'Não foi possível salvar o rascunho'
            });
        }
    };

    const carregarRascunho = () => {
        const rascunhoKey = getRascunhoKey();
        if (!rascunhoKey) return null;

        try {
            const rascunhoStr = localStorage.getItem(rascunhoKey);
            if (!rascunhoStr) return null;

            return JSON.parse(rascunhoStr);
        } catch (error) {
            console.error('Erro ao carregar rascunho:', error);
            return null;
        }
    };

    const limparRascunho = () => {
        const rascunhoKey = getRascunhoKey();
        if (!rascunhoKey) return;

        try {
            localStorage.removeItem(rascunhoKey);
        } catch (error) {
            console.error('Erro ao limpar rascunho:', error);
        }
    };

    const continuarRascunho = () => {
        if (rascunhoEncontrado) {
            setFormState(rascunhoEncontrado.formState);
            setItems(rascunhoEncontrado.items || []);
            toast.success('Rascunho carregado!', {
                description: 'Continue editando seu orçamento'
            });
        }
        setShowRascunhoDialog(false);
        setRascunhoEncontrado(null);
    };

    const descartarRascunho = () => {
        limparRascunho();
        setShowRascunhoDialog(false);
        setRascunhoEncontrado(null);
        // Resetar formState com data padrão de validade
        setFormState(prev => ({
            ...prev,
            validade: calcularDataValidadePadrao()
        }));
        toast.info('Rascunho descartado', {
            description: 'Iniciando novo orçamento'
        });
    };

    // Carregar dados iniciais e verificar rascunho
    useEffect(() => {
        loadInitialData();
        
        // Verificar se existe rascunho ao carregar a página
        if (userId) {
            const rascunho = carregarRascunho();
            if (rascunho && (rascunho.items?.length > 0 || rascunho.formState?.titulo || rascunho.formState?.clienteId)) {
                setRascunhoEncontrado(rascunho);
                setShowRascunhoDialog(true);
            }
        }
    }, [userId]);

    // Carregar dados de orçamento copiado (se houver)
    useEffect(() => {
        try {
            const orcamentoCopiaStr = localStorage.getItem('orcamentoCopia');
            if (orcamentoCopiaStr) {
                const orcamentoCopia = JSON.parse(orcamentoCopiaStr);
                
                // Preencher formState (exceto clienteId)
                setFormState(prev => ({
                    ...prev,
                    empresaCNPJ: orcamentoCopia.empresaCNPJ || prev.empresaCNPJ,
                    titulo: orcamentoCopia.titulo || '',
                    descricao: orcamentoCopia.descricao || '',
                    descricaoProjeto: orcamentoCopia.descricaoProjeto || '',
                    validade: orcamentoCopia.validade || prev.validade,
                    endereco: orcamentoCopia.endereco || '',
                    bairro: orcamentoCopia.bairro || '',
                    cidade: orcamentoCopia.cidade || '',
                    cep: orcamentoCopia.cep || '',
                    responsavelObra: orcamentoCopia.responsavelObra || '',
                    bdi: orcamentoCopia.bdi || prev.bdi,
                    previsaoInicio: orcamentoCopia.previsaoInicio || '',
                    previsaoTermino: orcamentoCopia.previsaoTermino || '',
                    condicaoPagamento: orcamentoCopia.condicaoPagamento || prev.condicaoPagamento
                }));

                // Preencher itens
                if (orcamentoCopia.items && Array.isArray(orcamentoCopia.items)) {
                    setItems(orcamentoCopia.items);
                }

                // Limpar localStorage
                localStorage.removeItem('orcamentoCopia');

                // Toast informativo
                toast.info('Orçamento copiado', {
                    description: 'Selecione um cliente para continuar'
                });
            }
        } catch (error) {
            console.error('Erro ao carregar orçamento copiado:', error);
        }
    }, []);

    // Salvar rascunho automaticamente ao sair da página
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (userId && (items.length > 0 || formState.titulo || formState.clienteId)) {
                salvarRascunho();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [userId, items, formState]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [clientesRes, materiaisRes, servicosRes, quadrosRes, kitsRes, cotacoesRes, empresasRes] = await Promise.all([
                clientesService.listar(),
                axiosApiService.get<Material[]>(ENDPOINTS.MATERIAIS),
                servicosService.listar({ ativo: true }),
                quadrosService.listar(),
                axiosApiService.get(ENDPOINTS.KITS), // Carregar kits
                axiosApiService.get('/api/cotacoes'), // Carregar cotações
                empresasService.listar({ ativo: true })
            ]);

            if (clientesRes.success && clientesRes.data) {
                setClientes(Array.isArray(clientesRes.data) ? clientesRes.data : []);
            }

            if (materiaisRes.success && materiaisRes.data) {
                const materiaisArray = Array.isArray(materiaisRes.data) ? materiaisRes.data : [];
                setMateriais(materiaisArray);
                // Filtrar apenas materiais com estoque > 0 para comparação
                setMateriaisComEstoque(materiaisArray.filter((m: Material) => m.estoque > 0));
            }

            if (servicosRes.success && servicosRes.data) {
                setServicos(Array.isArray(servicosRes.data) ? servicosRes.data : []);
            }

            if (quadrosRes.success && quadrosRes.data) {
                setQuadros(Array.isArray(quadrosRes.data) ? quadrosRes.data : []);
            }

            if (kitsRes.success && kitsRes.data) {
                const kitsData = Array.isArray(kitsRes.data) ? kitsRes.data : [];
                // Mapear kits do backend para o formato esperado
                const kitsMapeados = kitsData.map((kit: any) => ({
                    id: kit.id,
                    nome: kit.nome,
                    descricao: kit.descricao || '',
                    items: kit.items || [],
                    custoTotal: kit.preco || 0,
                    precoSugerido: kit.preco || 0,
                    ativo: kit.ativo !== false
                }));
                setKits(kitsMapeados);
                console.log(`✅ ${kitsMapeados.length} kits carregados`);
            }

            if (cotacoesRes.success && cotacoesRes.data) {
                const cotacoesArray = Array.isArray(cotacoesRes.data) ? cotacoesRes.data : [];
                setCotacoes(cotacoesArray);
                setCotacoesBancoFrio(cotacoesArray); // Cotações para comparação
            }

            if (empresasRes.success && empresasRes.data) {
                setEmpresas(Array.isArray(empresasRes.data) ? empresasRes.data : []);
            } else {
                setEmpresas([]);
            }
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
            setError('Erro ao carregar dados iniciais');
        } finally {
            setLoading(false);
        }
    };

    // Filtrar materiais para seleção
    const filteredMaterials = useMemo(() => {

        if (!itemSearchTerm.trim()) return (materiais || []).filter(m => m && m.ativo && (m.estoque ?? 0) > 0);
        const termo = itemSearchTerm.toLowerCase();
        return (materiais || []).filter(m => 
            m && m.ativo && (m.estoque ?? 0) > 0 && (
                (m.nome || '').toLowerCase().includes(termo) ||
                (m.sku || '').toLowerCase().includes(termo)
            )
        );
    }, [materiais, itemSearchTerm]);

    // Filtrar serviços para seleção
    const filteredServicos = useMemo(() => {

        if (!itemSearchTerm.trim()) return (servicos || []).filter(s => s && s.ativo);
        const termo = itemSearchTerm.toLowerCase();
        return (servicos || []).filter(s => 
            s && s.ativo && (
                (s.nome || '').toLowerCase().includes(termo) ||
                (s.codigo || '').toLowerCase().includes(termo) ||
                (s.descricao || '').toLowerCase().includes(termo)
            )
        );
    }, [servicos, itemSearchTerm]);

    // Filtrar quadros para seleção
    const filteredQuadros = useMemo(() => {

        if (!itemSearchTerm.trim()) return (quadros || []).filter(q => q && q.ativo);
        const termo = itemSearchTerm.toLowerCase();
        return (quadros || []).filter(q => 
            q && q.ativo && (
                (q.nome || '').toLowerCase().includes(termo) ||
                (q.descricao || '').toLowerCase().includes(termo)
            )
        );
    }, [quadros, itemSearchTerm]);

    // Filtrar kits para seleção
    const filteredKits = useMemo(() => {

        if (!itemSearchTerm.trim()) return (kits || []).filter(k => k && k.ativo);
        const termo = itemSearchTerm.toLowerCase();
        return (kits || []).filter(k => 
            k && k.ativo && (
                (k.nome || '').toLowerCase().includes(termo) ||
                (k.descricao || '').toLowerCase().includes(termo)
            )
        );
    }, [kits, itemSearchTerm]);

    // Filtrar cotações para seleção
    const filteredCotacoes = useMemo(() => {

        if (!itemSearchTerm.trim()) return (cotacoes || []).filter(c => c && c.ativo !== false);
        const termo = itemSearchTerm.toLowerCase();
        return (cotacoes || []).filter(c => 
            c && c.ativo !== false && (
                (c.nome || '').toLowerCase().includes(termo) ||
                (c.ncm || '').toLowerCase().includes(termo) ||
                (c.fornecedorNome || '').toLowerCase().includes(termo)
            )
        );
    }, [cotacoes, itemSearchTerm]);

    // Filtrar materiais com estoque para comparação (com busca global ou específica)
    const filteredMateriaisEstoque = useMemo(() => {
        const termoBusca = searchGlobalComparacao || searchEstoque;

        if (!termoBusca) return materiaisComEstoque || [];
        
        return (materiaisComEstoque || []).filter(material =>
            material && (
                (material.nome || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
                (material.sku || '').toLowerCase().includes(termoBusca.toLowerCase())
            )
        );
    }, [materiaisComEstoque, searchEstoque, searchGlobalComparacao]);

    // Filtrar cotações para comparação (com busca global ou específica)
    const filteredCotacoesComparacao = useMemo(() => {
        const termoBusca = searchGlobalComparacao || searchCotacoes;

        if (!termoBusca) return cotacoesBancoFrio || [];
        
        return (cotacoesBancoFrio || []).filter(cotacao =>
            cotacao && (
                (cotacao.nome || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
                (cotacao.ncm || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
                (cotacao.fornecedorNome || '').toLowerCase().includes(termoBusca.toLowerCase())
            )
        );
    }, [cotacoesBancoFrio, searchCotacoes, searchGlobalComparacao]);

    // Busca global em todos os tipos de itens
    useEffect(() => {
        if (!buscaGlobal.trim()) {
            setResultadosBuscaGlobal({
                materiais: [],
                servicos: [],
                kits: [],
                quadros: [],
                cotacoes: []
            });
            return;
        }

        const termo = buscaGlobal.toLowerCase();
        

        const materiaisEncontrados = (materiais || [])
            .filter(m => m && m.ativo && (m.estoque ?? 0) > 0)
            .filter(m => 
                (m.nome || '').toLowerCase().includes(termo) ||
                (m.sku || '').toLowerCase().includes(termo)
            );

        const servicosEncontrados = (servicos || [])
            .filter(s => s && s.ativo)
            .filter(s =>
                (s.nome || '').toLowerCase().includes(termo) ||
                (s.codigo || '').toLowerCase().includes(termo) ||
                (s.descricao || '').toLowerCase().includes(termo)
            );

        const kitsEncontrados = (kits || [])
            .filter(k => k && k.ativo)
            .filter(k =>
                (k.nome || '').toLowerCase().includes(termo) ||
                (k.descricao || '').toLowerCase().includes(termo)
            );

        const quadrosEncontrados = (quadros || [])
            .filter(q => q && q.ativo)
            .filter(q =>
                (q.nome || '').toLowerCase().includes(termo) ||
                (q.descricao || '').toLowerCase().includes(termo)
            );

        const cotacoesEncontradas = (cotacoes || [])
            .filter(c => c && c.ativo !== false)
            .filter(c =>
                (c.nome || '').toLowerCase().includes(termo) ||
                (c.ncm || '').toLowerCase().includes(termo) ||
                (c.fornecedorNome || '').toLowerCase().includes(termo)
            );

        setResultadosBuscaGlobal({
            materiais: materiaisEncontrados,
            servicos: servicosEncontrados,
            kits: kitsEncontrados,
            quadros: quadrosEncontrados,
            cotacoes: cotacoesEncontradas
        });
    }, [buscaGlobal, materiais, servicos, kits, quadros, cotacoes]);

    // Adicionar item com validação de estoque vs cotação
    const handleAddItemComValidacao = (material?: Material, cotacao?: any, quantidade?: number) => {
        const qtd = quantidade || 1;
        
        // Validar estoque se for material
        if (material) {
            if (material.estoque < qtd) {
                toast.error('Estoque insuficiente', {
                    description: `Estoque disponível: ${material.estoque} ${material.unidadeMedida}. Solicitado: ${qtd} ${material.unidadeMedida}`
                });
                return;
            }
            

            // Usar valorVenda se disponível, senão usar preco (preço de compra)
            const precoVenda = material.valorVenda || material.preco;
            const precoBase = precoVenda; // Armazenar base para recalcular quando BDI mudar

            const newItem: OrcamentoItem = {
                tipo: 'MATERIAL',
                materialId: material.id,
                nome: material.nome,
                descricao: material.nome,
                unidadeMedida: material.unidadeMedida,
                ncm: material.ncm || undefined, // ✅ NCM do material para faturamento
                quantidade: qtd,
                custoUnit: material.preco,
                precoBase: precoBase, // Base do preço de venda (sem BDI)
                precoUnit: precoBase * (1 + formState.bdi / 100), // Preço unitário usa valorVenda || preco
                subtotal: precoBase * (1 + formState.bdi / 100) * qtd
            };
            
            setItems(prev => [...prev, newItem]);
            toast.success('Material adicionado', {
                description: `${material.nome} (${qtd} ${material.unidadeMedida}) - Estoque: ${material.estoque} ${material.unidadeMedida}`
            });
        }
        
        // Adicionar cotação se fornecida
        if (cotacao) {
            // Usar valorVenda se disponível; senão, aplicar markup padrão de 40% sobre o valor da cotação
            const valorVenda = cotacao.valorVenda || (cotacao.valorUnitario || 0) * 1.4;
            const precoBase = valorVenda;

            const newItem: OrcamentoItem = {
                tipo: 'COTACAO',
                cotacaoId: cotacao.id,
                nome: cotacao.nome,
                descricao: cotacao.observacoes || cotacao.nome,
                unidadeMedida: cotacao.unidadeMedida || 'UN',
                ncm: cotacao.ncm || undefined, // ✅ NCM da cotação para faturamento
                quantidade: qtd,
                custoUnit: cotacao.valorUnitario || 0,
                precoBase: precoBase, // Base do preço de venda (sem BDI)
                precoUnit: precoBase * (1 + formState.bdi / 100),
                subtotal: precoBase * (1 + formState.bdi / 100) * qtd,
                dataAtualizacaoCotacao: cotacao.dataAtualizacao
            };
            
            setItems(prev => [...prev, newItem]);
            toast.success('Cotação adicionada', {
                description: `${cotacao.nome} do banco frio - Fornecedor: ${cotacao.fornecedorNome || 'N/A'}`
            });
        }
        
        // Limpar seleções
        setMaterialSelecionadoComparacao(null);
        setCotacaoSelecionadaComparacao(null);
        setMateriaisSelecionadosComparacao(new Set());
        setCotacoesSelecionadasComparacao(new Set());
    };

    // Funções para gerenciar seleção múltipla
    const toggleMaterialSelecionado = (materialId: string) => {
        setMateriaisSelecionadosComparacao(prev => {
            const novo = new Set(prev);
            if (novo.has(materialId)) {
                novo.delete(materialId);
            } else {
                novo.add(materialId);
            }
            return novo;
        });
    };

    const toggleCotacaoSelecionada = (cotacaoId: string) => {
        setCotacoesSelecionadasComparacao(prev => {
            const novo = new Set(prev);
            if (novo.has(cotacaoId)) {
                novo.delete(cotacaoId);
            } else {
                novo.add(cotacaoId);
            }
            return novo;
        });
    };

    // Função para inserir múltiplos itens selecionados
    const handleInserirSelecionados = () => {
        let inseridos = 0;
        
        // Inserir materiais selecionados
        materiaisSelecionadosComparacao.forEach(materialId => {
            const material = materiaisComEstoque.find(m => m.id === materialId);
            if (material) {
                handleAddItemComValidacao(material, undefined, 1);
                inseridos++;
            }
        });
        
        // Inserir cotações selecionadas
        cotacoesSelecionadasComparacao.forEach(cotacaoId => {
            const cotacao = cotacoesBancoFrio.find(c => c.id === cotacaoId);
            if (cotacao) {
                handleAddItemComValidacao(undefined, cotacao, 1);
                inseridos++;
            }
        });
        
        if (inseridos > 0) {
            toast.success(`${inseridos} item(ns) inserido(s) com sucesso!`);
            // Limpar seleções
            setMateriaisSelecionadosComparacao(new Set());
            setCotacoesSelecionadasComparacao(new Set());
        }
    };

    // Calcular totais do orçamento
    const calculosOrcamento = useMemo(() => {
        const subtotalItens = items.reduce((sum, item) => sum + item.subtotal, 0);
        const valorComDesconto = subtotalItens - formState.descontoValor;
        const valorTotalFinal = valorComDesconto * (1 + formState.impostoPercentual / 100);

        return { subtotalItens, valorComDesconto, valorTotalFinal };
    }, [items, formState.descontoValor, formState.impostoPercentual]);

    // Adicionar material do estoque ao orçamento
    const handleAddItem = (material: Material, manterModalAberto = false, unidadeVendaParam?: string) => {
        // Identificar tipo de material para conversão de unidades
        const tipoMaterial = identificarTipoMaterial(material.nome);
        const unidadeVenda = unidadeVendaParam || material.unidadeMedida;
        
        // Usar valorVenda se disponível, senão usar preco (preço de compra)
        let precoVenda = material.valorVenda || material.preco;
        
        // Se for barramento e a unidade for cm, ajustar o preço (dividir por 100)
        if ((tipoMaterial === 'BARRAMENTO_COBRE' || tipoMaterial === 'TRILHO_DIN') && unidadeVenda === 'cm') {
            precoVenda = precoVenda / 100; // Preço por metro / 100 = preço por cm
        }
        
        const precoBase = precoVenda; // Armazenar base para recalcular quando BDI mudar

        const newItem: OrcamentoItem = {
            tipo: 'MATERIAL',
            materialId: material.id,
            nome: material.nome,
            descricao: material.nome, // Usar o nome como descrição
            unidadeMedida: material.unidadeMedida,
            unidadeVenda: unidadeVenda, // ✅ NOVO: Unidade de venda
            tipoMaterial: tipoMaterial, // ✅ NOVO: Tipo para conversão
            ncm: material.ncm || undefined, // ✅ NCM do material para faturamento
            quantidade: 1,
            custoUnit: material.preco,
            precoBase: precoBase, // Base do preço de venda (sem BDI)
            precoUnit: precoBase * (1 + formState.bdi / 100), // Preço unitário usa valorVenda || preco
            subtotal: precoBase * (1 + formState.bdi / 100)
        };

        setItems(prev => [...prev, newItem]);
        if (!manterModalAberto) {
            setShowItemModal(false);
        }
        setItemSearchTerm('');
        setBuscaGlobal(''); // Limpar busca global ao adicionar
        toast.success('Material adicionado', {
            description: `${material.nome} adicionado ao orçamento (${unidadeVenda})`
        });
    };


    // Fechar modais com ESC
    useEscapeKey(showItemModal, () => {
        setShowItemModal(false);
        setModalExpandido(false);
    });

    // Adicionar serviço ao orçamento
    const handleAddServico = (servico: Servico, manterModalAberto = false) => {
        const newItem: OrcamentoItem = {
            tipo: 'SERVICO',
            servicoNome: servico.nome,
            nome: servico.nome,
            descricao: servico.descricao,
            unidadeMedida: servico.unidade || 'UN',
            quantidade: 1,
            custoUnit: servico.preco,
            precoUnit: servico.preco * (1 + formState.bdi / 100),
            subtotal: servico.preco * (1 + formState.bdi / 100)
        };

        setItems(prev => [...prev, newItem]);
        if (!manterModalAberto) {
            setShowItemModal(false);
        }
        setItemSearchTerm('');
        setBuscaGlobal(''); // Limpar busca global ao adicionar
        toast.success('Serviço adicionado', {
            description: `${servico.nome} adicionado ao orçamento`
        });
    };

    // Adicionar quadro ao orçamento
    const handleAddQuadro = (quadro: Quadro, manterModalAberto = false) => {
        const newItem: OrcamentoItem = {
            tipo: 'QUADRO_PRONTO',
            nome: quadro.nome,
            descricao: quadro.descricao,
            unidadeMedida: 'UN',
            quantidade: 1,
            custoUnit: quadro.custoTotal,
            precoUnit: quadro.precoSugerido || quadro.custoTotal * (1 + formState.bdi / 100),
            subtotal: quadro.precoSugerido || quadro.custoTotal * (1 + formState.bdi / 100)
        };

        setItems(prev => [...prev, newItem]);
        if (!manterModalAberto) {
            setShowItemModal(false);
        }
        setItemSearchTerm('');
        setBuscaGlobal(''); // Limpar busca global ao adicionar
        toast.success('Quadro adicionado', {
            description: `${quadro.nome} adicionado ao orçamento`
        });
    };

    // Adicionar cotação ao orçamento (BANCO FRIO)
    const handleAddCotacao = (cotacao: any, manterModalAberto = false, unidadeVendaParam?: string) => {
        // Identificar tipo de material para conversão de unidades
        const tipoMaterial = identificarTipoMaterial(cotacao.nome);
        const unidadeVenda = unidadeVendaParam || 'UN';
        
        // Calcular preço baseado na unidade de venda
        let precoUnitario = cotacao.valorUnitario;
        if (tipoMaterial === 'BARRAMENTO_COBRE' || tipoMaterial === 'TRILHO_DIN') {
            if (unidadeVenda === 'cm') {
                // Se vender em cm, dividir o preço por metro por 100
                precoUnitario = cotacao.valorUnitario / 100;
            }
        }
        
        const newItem: OrcamentoItem = {
            tipo: 'COTACAO',
            cotacaoId: cotacao.id,
            nome: cotacao.nome,
            descricao: cotacao.nome, // ✅ Apenas o nome do material (não mostrar fornecedor)
            dataAtualizacaoCotacao: cotacao.dataAtualizacao,
            unidadeMedida: unidadeVenda,
            unidadeVenda: unidadeVenda, // ✅ NOVO: Unidade de venda
            tipoMaterial: tipoMaterial, // ✅ NOVO: Tipo para conversão
            quantidade: 1,
            custoUnit: precoUnitario,
            precoUnit: precoUnitario * (1 + formState.bdi / 100),
            subtotal: precoUnitario * (1 + formState.bdi / 100)
        };

        setItems(prev => [...prev, newItem]);
        if (!manterModalAberto) {
            setShowItemModal(false);
        }
        setItemSearchTerm('');
        setBuscaGlobal(''); // Limpar busca global ao adicionar
        toast.success('Cotação adicionada', {
            description: `${cotacao.nome} do banco frio adicionado ao orçamento (${unidadeVenda})`
        });
    };

    // Adicionar kit ao orçamento
    const handleAddKit = (kit: Kit, manterModalAberto = false) => {
        const newItem: OrcamentoItem = {
            tipo: 'KIT',
            kitId: kit.id,
            nome: kit.nome,
            descricao: kit.descricao,
            unidadeMedida: 'UN',
            quantidade: 1,
            custoUnit: kit.custoTotal,
            precoUnit: kit.precoSugerido || kit.custoTotal * (1 + formState.bdi / 100),
            subtotal: kit.precoSugerido || kit.custoTotal * (1 + formState.bdi / 100)
        };

        setItems(prev => [...prev, newItem]);
        if (!manterModalAberto) {
            setShowItemModal(false);
        }
        setItemSearchTerm('');
        setBuscaGlobal(''); // Limpar busca global ao adicionar
        toast.success('Kit adicionado', {
            description: `${kit.nome} adicionado ao orçamento`
        });
    };

    // Adicionar item manual (sem estoque)
    const handleAddItemManual = () => {
        // Validação
        if (!novoItemManual.nome.trim()) {
            toast.error('Nome do item obrigatório', {
                description: 'Digite o nome ou descrição do item'
            });
            return;
        }
        if (novoItemManual.custoUnit <= 0) {
            toast.error('Custo unitário inválido', {
                description: 'Digite um custo unitário maior que zero'
            });
            return;
        }
        if (novoItemManual.quantidade <= 0) {
            toast.error('Quantidade inválida', {
                description: 'Digite uma quantidade maior que zero'
            });
            return;
        }

        const precoUnit = novoItemManual.custoUnit * (1 + formState.bdi / 100);
        const newItem: OrcamentoItem = {
            tipo: novoItemManual.tipo,
            nome: novoItemManual.nome,
            descricao: novoItemManual.descricao,
            unidadeMedida: novoItemManual.unidadeMedida,
            quantidade: novoItemManual.quantidade,
            custoUnit: novoItemManual.custoUnit,
            precoUnit: precoUnit,
            subtotal: precoUnit * novoItemManual.quantidade
        };

        setItems(prev => [...prev, newItem]);
        
        // Resetar formulário
        setNovoItemManual({
            nome: '',
            descricao: '',
            unidadeMedida: 'UN',
            quantidade: 1,
            custoUnit: 0,
            tipo: 'MATERIAL'
        });
        
        setShowItemModal(false);
        toast.success('Item adicionado!', {
            description: `${novoItemManual.nome} - ${novoItemManual.quantidade} ${novoItemManual.unidadeMedida}`,
            icon: '✏️'
        });
    };

    // Remover item
    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    // Atualizar quantidade do item
    const handleUpdateItemQuantity = (index: number, quantidade: number) => {
        setItems(prev => prev.map((item, i) => {
            if (i === index) {
                return {
                    ...item,
                    quantidade,
                    subtotal: item.precoUnit * quantidade
                };
            }
            return item;
        }));
    };

    // Atualizar preço unitário do item (valor de venda editável)
    const handleUpdateItemPrice = (index: number, novoPrecoUnit: number) => {
        if (novoPrecoUnit < 0) {
            toast.error('Valor inválido', {
                description: 'O valor unitário não pode ser negativo'
            });
            return;
        }

        setItems(prev => prev.map((item, i) => {
            if (i === index) {
                return {
                    ...item,
                    precoUnit: novoPrecoUnit,
                    subtotal: novoPrecoUnit * item.quantidade,
                    precoEditadoManual: true // Marcar como editado manualmente
                };
            }
            return item;
        }));
    };

    // Atualizar BDI e recalcular preços (apenas para itens não editados manualmente)
    const handleBdiChange = (newBdi: number) => {
        setFormState(prev => ({ ...prev, bdi: newBdi }));

        setItems(prev => prev.map(item => {
            // Se o preço foi editado manualmente, não recalcular com BDI
            if (item.precoEditadoManual) {
                return item;
            }
            
            // Usar precoBase se disponível (valorVenda || preco), senão usar custoUnit como fallback
            const basePreco = item.precoBase !== undefined ? item.precoBase : item.custoUnit;
            const precoUnit = basePreco * (1 + newBdi / 100);
            return {
                ...item,
                precoUnit,
                subtotal: precoUnit * item.quantidade
            };
        }));
    };

    // Selecionar endereço do cliente
    const selecionarEnderecoCliente = () => {
        if (!formState.clienteId) {
            toast.error('Selecione um cliente primeiro', {
                description: 'É necessário selecionar um cliente para usar o endereço cadastrado'
            });
            return;
        }

        const clienteSelecionado = clientes.find(c => c.id === formState.clienteId);
        
        if (!clienteSelecionado) {
            toast.error('Cliente não encontrado');
            return;
        }

        if (!clienteSelecionado.endereco) {
            toast.warning('Cliente sem endereço cadastrado', {
                description: 'Este cliente não possui endereço cadastrado. Você pode preencher manualmente.'
            });
            return;
        }

        // Preencher campos com dados do cliente
        setFormState(prev => ({
            ...prev,
            enderecoObra: clienteSelecionado.endereco || '',
            cidade: clienteSelecionado.cidade || '',
            bairro: '', // Cliente não tem bairro separado, mas pode ter no endereço
            cep: clienteSelecionado.cep || ''
        }));

        setUsandoEnderecoCliente(true);
        
        toast.success('Endereço do cliente aplicado', {
            description: 'Os campos foram preenchidos com o endereço cadastrado do cliente'
        });
    };

    // Limpar e permitir endereço diferente
    const usarEnderecoDiferente = () => {
        setFormState(prev => ({
            ...prev,
            enderecoObra: '',
            cidade: '',
            bairro: '',
            cep: ''
        }));
        
        setUsandoEnderecoCliente(false);
        
        toast.info('Endereço limpo', {
            description: 'Você pode preencher um endereço diferente para a obra'
        });
    };

    // Criar cliente rápido
    const handleCreateClienteRapido = async (nome: string, tipo: 'PF' | 'PJ') => {
        try {
            setCriandoClienteRapido(true);
            
            const response = await clientesService.criarClienteRapido(nome, tipo);
            
            if (response.success && response.data) {
                // Atualizar lista de clientes
                const clientesRes = await clientesService.listar();
                if (clientesRes.success && clientesRes.data) {
                    setClientes(clientesRes.data);
                }

                // Selecionar novo cliente automaticamente
                setFormState(prev => ({ ...prev, clienteId: response.data!.id }));
                
                // Fechar modal
                setShowClienteRapidoModal(false);
                
                toast.success('Cliente criado com sucesso', {
                    description: `${nome} foi adicionado e selecionado`
                });
            } else {
                toast.error('Erro ao criar cliente', {
                    description: response.error || 'Não foi possível criar o cliente'
                });
            }
        } catch (error) {
            console.error('Erro ao criar cliente rápido:', error);
            toast.error('Erro ao criar cliente', {
                description: 'Ocorreu um erro ao tentar criar o cliente'
            });
        } finally {
            setCriandoClienteRapido(false);
        }
    };

    // Salvar orçamento
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validações
        if (items.length === 0) {
            toast.error('Nenhum item adicionado', {
                description: 'Adicione pelo menos um item ao orçamento'
            });
            return;
        }

        if (!formState.clienteId) {
            toast.error('Cliente obrigatório', {
                description: 'Selecione um cliente para continuar'
            });
            return;
        }

        try {
            setSalvando(true);

            const orcamentoData: any = {
                clienteId: formState.clienteId,
                titulo: formState.titulo,
                descricao: formState.descricao,
                descricaoProjeto: formState.descricaoProjeto,
                validade: formState.validade,
                bdi: formState.bdi,
                classificacao: formState.classificacao, // ✅ NOVO: Classificação do orçamento
                observacoes: formState.observacoes,
                empresaCNPJ: formState.empresaCNPJ,
                enderecoObra: formState.enderecoObra,
                cidade: formState.cidade,
                bairro: formState.bairro,
                cep: formState.cep,
                responsavelObra: formState.responsavelObra,
                previsaoInicio: formState.previsaoInicio || null,
                previsaoTermino: formState.previsaoTermino || null,
                descontoValor: formState.descontoValor,
                impostoPercentual: formState.impostoPercentual,
                condicaoPagamento: formState.condicaoPagamento,
                items: items.map(item => ({
                    tipo: item.tipo,
                    materialId: item.materialId,
                    kitId: item.kitId,
                    cotacaoId: item.cotacaoId,
                    servicoNome: item.servicoNome,
                    descricao: item.descricao || item.nome,
                    ncm: item.ncm, // ✅ NCM para faturamento NF-e/NFS-e
                    quantidade: item.quantidade,
                    custoUnit: item.custoUnit,
                    precoUnitario: item.precoUnit,
                    subtotal: item.subtotal,
                    unidadeVenda: item.unidadeVenda,
                    tipoMaterial: item.tipoMaterial
                }))
            };

            const promise = orcamentosService.criar(orcamentoData);

            toast.promise(promise, {
                loading: 'Criando orçamento...',
                success: (response) => {
                    if (response.success) {

                        // Limpar rascunho após salvar com sucesso
                        limparRascunho();
                        if (onOrcamentoCriado) onOrcamentoCriado();
                        setTimeout(() => setAbaAtiva('listagem'), 500);
                        return 'Orçamento criado com sucesso!';
                    }
                    throw new Error(response.error || 'Erro ao criar orçamento');
                },
                error: (err: any) => {
                    setError(err.message || err.response?.data?.message || 'Erro ao criar orçamento');
                    return 'Erro ao criar orçamento';
                }
            });
        } catch (err: any) {
            console.error('Erro ao criar orçamento:', err);
            setError(err.response?.data?.message || 'Erro ao criar orçamento');
        } finally {
            setSalvando(false);
        }
    };

    // Cancelar e voltar
    const handleCancelar = () => {
        if (items.length > 0 || formState.titulo) {
            toast('Descartar alterações?', {
                description: 'Todos os dados não salvos serão perdidos.',
                duration: 8000,
                action: {
                    label: 'Descartar',
                    onClick: () => setAbaAtiva('listagem')
                },
                cancel: {
                    label: 'Continuar editando',
                    onClick: () => {}
                }
            });
        } else {
            setAbaAtiva('listagem');
        }
    };

    const [proximoNumero, setProximoNumero] = useState<number | null>(null);
    const [carregandoNumero, setCarregandoNumero] = useState<boolean>(false);
    const [erroNumero, setErroNumero] = useState<string | null>(null);

    // Carregar próximo número sequencial do orçamento (informativo)
    useEffect(() => {
        const carregarProximoNumero = async () => {
            try {
                setCarregandoNumero(true);
                setErroNumero(null);
                const response = await axiosApiService.get<{ proximoNumero: number }>('/api/orcamentos/proximo-numero');
                if (response.success && response.data?.proximoNumero) {
                    setProximoNumero(response.data.proximoNumero);
                }
            } catch (error) {
                console.error('Erro ao obter próximo número de orçamento:', error);
                setErroNumero('Não foi possível carregar o próximo número');
            } finally {
                setCarregandoNumero(false);
            }
        };

        carregarProximoNumero();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Carregando dados...</p>
                </div>
            </div>
        );
    }

    return (

        <>
            {/* Dialog para rascunho encontrado */}
            <AlertDialog open={showRascunhoDialog} onOpenChange={setShowRascunhoDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Rascunho encontrado</AlertDialogTitle>
                        <AlertDialogDescription>
                            Foi encontrado um rascunho de orçamento anteriormente salvo.
                            {rascunhoEncontrado?.dataSalvamento && (
                                <span className="block mt-2 text-xs text-gray-500">
                                    Salvo em: {new Date(rascunhoEncontrado.dataSalvamento).toLocaleString('pt-BR')}
                                </span>
                            )}
                            Deseja continuar editando o rascunho ou começar um novo orçamento?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={descartarRascunho}>
                            Descartar e começar novo
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={continuarRascunho}>
                            Continuar rascunho
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-dark-bg">
            {/* Header */}
            <header className="mb-8">
                <div className="flex items-center gap-4 mb-4 sm:mb-6">
                    <button
                        onClick={handleCancelar}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        Voltar
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-2">
                            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-dark-text tracking-tight">
                                Novo Orçamento
                            </h1>
                            <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">
                                Nº do orçamento:&nbsp;
                                <span className="font-semibold">
                                    {carregandoNumero && 'Carregando...'}
                                    {!carregandoNumero && proximoNumero && `#${proximoNumero}`}
                                    {!carregandoNumero && !proximoNumero && !erroNumero && 'Em definição'}
                                    {!carregandoNumero && !!erroNumero && 'Indisponível'}
                                </span>
                            </span>
                        </div>
                        <p className="text-sm sm:text-base text-gray-500 dark:text-dark-text-secondary mt-2">
                            Crie uma nova proposta comercial
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
                        <p className="text-red-800 dark:text-red-300">{error}</p>
                    </div>
                )}
            </header>

            <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-6">
                {/* SEÇÃO 1: Informações Básicas */}
                <div className="card-primary">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">📋</span>
                        Informações Básicas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                CNPJ da Empresa Executora
                            </label>
                            <select
                                value={formState.empresaCNPJ}
                                onChange={(e) => setFormState(prev => ({ ...prev, empresaCNPJ: e.target.value }))}
                                className="select-field"
                            >
                                <option value="">Selecione o CNPJ</option>
                                {empresas
                                    .filter(emp => emp.ativo)
                                    .map(emp => (
                                        <option key={emp.id} value={emp.cnpj}>
                                            {(emp.nomeFantasia || emp.razaoSocial) + ' - ' + emp.cnpj}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Cliente *
                            </label>
                            <ClienteCombobox
                                clientes={clientes}
                                value={formState.clienteId}
                                onChange={(clienteId) => {
                                    setFormState(prev => ({ ...prev, clienteId }));
                                    // Limpar estado de endereço quando mudar cliente
                                    if (usandoEnderecoCliente) {
                                        setUsandoEnderecoCliente(false);
                                    }
                                }}
                                onCreateNew={() => setShowClienteRapidoModal(true)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Título do Projeto
                            </label>
                            <input
                                type="text"
                                value={formState.titulo}
                                onChange={(e) => setFormState(prev => ({ ...prev, titulo: e.target.value }))}
                                className="input-field"
                                placeholder="Ex: Instalação Elétrica - Edifício Comercial"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Validade do Orçamento
                            </label>
                            <input
                                type="date"
                                value={formState.validade}
                                onChange={(e) => setFormState(prev => ({ ...prev, validade: e.target.value }))}
                                className="input-field"
                            />
                        </div>


                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Endereço da Obra (Rua e Número)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formState.enderecoObra}
                                    onChange={(e) => {
                                        setFormState(prev => ({ ...prev, enderecoObra: e.target.value }));
                                        setUsandoEnderecoCliente(false);
                                    }}
                                    className="input-field flex-1"
                                    placeholder="Ex: Rua das Flores, 123"
                                    disabled={usandoEnderecoCliente}
                                />
                                <button
                                    type="button"
                                    onClick={selecionarEnderecoCliente}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                                    title="Usar endereço cadastrado do cliente"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                    Selecionar do Cliente
                                </button>
                                {usandoEnderecoCliente && (
                                    <button
                                        type="button"
                                        onClick={usarEnderecoDiferente}
                                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                                        title="Usar endereço diferente"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Endereço Diferente
                                    </button>
                                )}
                            </div>
                            {usandoEnderecoCliente && (
                                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Usando endereço cadastrado do cliente
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Bairro
                            </label>
                            <input
                                type="text"
                                value={formState.bairro}
                                onChange={(e) => setFormState(prev => ({ ...prev, bairro: e.target.value }))}
                                className="input-field"
                                placeholder="Ex: Centro"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Cidade
                            </label>
                            <input
                                type="text"
                                value={formState.cidade}
                                onChange={(e) => setFormState(prev => ({ ...prev, cidade: e.target.value }))}
                                className="input-field"
                                placeholder="Ex: Florianópolis"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                CEP
                            </label>
                            <input
                                type="text"
                                value={formState.cep}
                                onChange={(e) => setFormState(prev => ({ ...prev, cep: e.target.value }))}
                                className="input-field"
                                placeholder="00000-000"
                                maxLength={9}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Responsável no Local
                            </label>
                            <input
                                type="text"
                                value={formState.responsavelObra}
                                onChange={(e) => setFormState(prev => ({ ...prev, responsavelObra: e.target.value }))}
                                className="input-field"
                                placeholder="Nome do responsável técnico"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                BDI - Margem (%)
                            </label>
                            <input
                                type="number"
                                value={formState.bdi}
                                onChange={(e) => handleBdiChange(Number(e.target.value))}
                                min="0"
                                max="100"
                                className="input-field"
                                placeholder="20"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Descrição Resumida
                            </label>
                            <textarea
                                value={formState.descricao}
                                onChange={(e) => setFormState(prev => ({ ...prev, descricao: e.target.value }))}
                                rows={2}
                                className="textarea-field"
                                placeholder="Resumo breve do projeto..."
                            />
                        </div>
                    </div>
                </div>

                {/* SEÇÃO 2: Prazos e Cronograma */}
                <div className="card-primary">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">📅</span>
                        Prazos e Cronograma
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Previsão de Início
                            </label>
                            <input
                                type="date"
                                value={formState.previsaoInicio}
                                onChange={(e) => setFormState(prev => ({ ...prev, previsaoInicio: e.target.value }))}
                                className="input-field"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                Previsão de Término
                            </label>
                            <input
                                type="date"
                                value={formState.previsaoTermino}
                                onChange={(e) => setFormState(prev => ({ ...prev, previsaoTermino: e.target.value }))}
                                className="input-field"
                            />
                        </div>
                    </div>
                </div>

                {/* SEÇÃO 3: Itens do Orçamento */}
                <div className="card-primary">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text">Itens do Orçamento</h3>
                        <button
                            type="button"
                            onClick={() => setShowItemModal(true)}
                            className="btn-info flex items-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Adicionar Item
                        </button>
                    </div>

                    {items.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-border">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">📦</span>
                            </div>
                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhum item adicionado</p>
                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">Clique em "Adicionar Item" para começar</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map((item, index) => {
                                // Buscar foto do material se for do tipo MATERIAL
                                const materialComFoto = item.tipo === 'MATERIAL' && item.materialId 
                                    ? materiais.find(m => m.id === item.materialId)
                                    : null;
                                const fotoUrl = materialComFoto?.imagemUrl;

                                return (
                                    <div key={index} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden hover:shadow-md transition-all">
                                        <div className="flex items-center gap-4 p-4">
                                            {/* Coluna de Foto - Compacta */}
                                            <div className="flex-shrink-0">
                                                {fotoUrl ? (
                                                    <img
                                                        src={getUploadUrl(fotoUrl)}
                                                        alt={item.nome}
                                                        className="w-14 h-14 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                                                        onError={(e) => {
                                                            const imgElement = e.target as HTMLImageElement;
                                                            imgElement.style.display = 'none';
                                                            const placeholder = document.createElement('div');
                                                            placeholder.className = 'w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center';
                                                            placeholder.innerHTML = '<svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                                                            imgElement.parentElement?.appendChild(placeholder);
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Nome e Badges - Expandido */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 dark:text-dark-text truncate">{item.nome}</p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className="text-xs text-gray-500 dark:text-dark-text-secondary">{item.unidadeMedida}</span>
                                                    {/* Campo NCM */}
                                                    <div className="flex items-center gap-1">
                                                        <label className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary">NCM:</label>
                                                        <input
                                                            type="text"
                                                            value={item.ncm || ''}
                                                            onChange={(e) => {
                                                                setItems(prev => prev.map((it, i) => 
                                                                    i === index ? { ...it, ncm: e.target.value || undefined } : it
                                                                ));
                                                            }}
                                                            placeholder="00000000"
                                                            maxLength={8}
                                                            className="w-20 px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    {/* Badge de Banco Frio */}
                                                    {(item.tipo === 'COTACAO' || (item as any).cotacao || (item as any).cotacaoId) && (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                                                            <span>Banco Frio</span>
                                                            {(() => {
                                                                const dataStr = (item as any).cotacao?.dataAtualizacao || 
                                                                              item.dataAtualizacaoCotacao || 
                                                                              (item as any).cotacao?.createdAt ||
                                                                              (item as any).dataAtualizacao;
                                                                if (dataStr) {
                                                                    const data = new Date(dataStr);
                                                                    if (!isNaN(data.getTime())) {
                                                                        return <span>• {data.toLocaleDateString('pt-BR')}</span>;
                                                                    }
                                                                }
                                                                return null;
                                                            })()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Quantidade - Compacto */}
                                            <div className="flex-shrink-0 w-24">
                                                <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">Qtd.</label>
                                                <input
                                                    type="number"
                                                    value={item.quantidade}
                                                    onChange={(e) => handleUpdateItemQuantity(index, Number(e.target.value))}
                                                    min="1"
                                                    step="0.01"
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                                />
                                            </div>

                                            {/* Valor Unitário - Compacto */}
                                            <div className="flex-shrink-0 w-32">
                                                <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">
                                                    Valor Unit.
                                                    {item.precoEditadoManual && <span className="ml-1 text-blue-600 dark:text-blue-400" title="Editado">✏️</span>}
                                                </label>
                                                <input
                                                    type="number"
                                                    value={item.precoUnit.toFixed(2)}
                                                    onChange={(e) => {
                                                        const novoValor = parseFloat(e.target.value) || 0;
                                                        handleUpdateItemPrice(index, novoValor);
                                                    }}
                                                    onBlur={(e) => {
                                                        const valor = parseFloat(e.target.value) || 0;
                                                        if (valor !== item.precoUnit) {
                                                            handleUpdateItemPrice(index, valor);
                                                        }
                                                    }}
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                                    placeholder="0.00"
                                                />
                                            </div>

                                            {/* Subtotal - Compacto */}
                                            <div className="flex-shrink-0 w-32">
                                                <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">Subtotal</label>
                                                <p className="text-base font-bold text-purple-700 dark:text-purple-300">
                                                    R$ {item.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                            </div>

                                            {/* Botão Deletar - Compacto */}
                                            <div className="flex-shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                    title="Remover item"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* SEÇÃO 4: Cálculo Financeiro */}
                <div className="card-primary">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">💰</span>
                        Cálculo Financeiro
                    </h3>
                    <div className="space-y-4">
                        {/* Subtotal */}
                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-xl">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Subtotal (com BDI {formState.bdi}%)</span>
                                <span className="text-xl font-bold text-blue-900 dark:text-blue-200">
                                    R$ {calculosOrcamento.subtotalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Desconto e Impostos */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Desconto (R$)
                                </label>
                                <input
                                    type="number"
                                    value={formState.descontoValor}
                                    onChange={(e) => setFormState(prev => ({ ...prev, descontoValor: parseFloat(e.target.value) || 0 }))}
                                    min="0"
                                    step="0.01"
                                    className="input-field"
                                    placeholder="0,00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Impostos (%)
                                </label>
                                <input
                                    type="number"
                                    value={formState.impostoPercentual}
                                    onChange={(e) => setFormState(prev => ({ ...prev, impostoPercentual: parseFloat(e.target.value) || 0 }))}
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    className="input-field"
                                    placeholder="0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                    Condição de Pagamento
                                </label>
                                <select
                                    value={formState.condicaoPagamento}
                                    onChange={(e) => setFormState(prev => ({ ...prev, condicaoPagamento: e.target.value }))}
                                    className="select-field"
                                >
                                    <option>À Vista</option>
                                    <option>30 dias</option>
                                    <option>60 dias</option>
                                    <option>90 dias</option>
                                    <option>Parcelado</option>
                                </select>
                            </div>
                        </div>

                        {/* TOTAL FINAL */}
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 border-2 border-purple-300 dark:border-purple-700 p-6 rounded-xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="text-lg font-semibold text-purple-700 dark:text-purple-300 uppercase">Valor Total Final</span>
                                    <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
                                        Subtotal - Desconto + Impostos
                                    </p>
                                </div>
                                <span className="text-4xl font-bold text-purple-700 dark:text-purple-300">
                                    R$ {calculosOrcamento.valorTotalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SEÇÃO 5: Descrição Técnica com Editor WYSIWYG */}
                <div className="card-primary">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text mb-2 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">📝</span>
                            Descrição Técnica do Projeto
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                            💡 Use o editor abaixo para criar uma descrição técnica profissional. Você pode formatar o texto, inserir imagens, criar tabelas e muito mais.
                        </p>
                    </div>

                    {/* Editor Jodit WYSIWYG */}
                    <div className="mb-6">
                        <JoditEditorComponent
                            value={formState.descricaoProjeto}
                            onChange={(content) => setFormState(prev => ({ ...prev, descricaoProjeto: content }))}
                            placeholder="Digite a descrição técnica completa do projeto... Você pode formatar o texto, inserir imagens, criar tabelas e listas."
                            height={500}
                        />
                    </div>

                    {/* Dica de Uso */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">💡 Dicas do Editor</h4>
                                <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                                    <li>• <strong>Imagens:</strong> Clique no ícone de imagem para inserir fotos inline</li>
                                    <li>• <strong>Tabelas:</strong> Use para listar materiais e especificações</li>
                                    <li>• <strong>Formatação:</strong> Destaque informações importantes com negrito/cores</li>
                                    <li>• <strong>Preview:</strong> Use o botão de visualização para ver o resultado final</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Botões de Ação Fixos no Footer */}
                <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border shadow-lg p-6 rounded-t-2xl">
                    <div className="max-w-6xl mx-auto flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={handleCancelar}
                            className="btn-secondary"
                            disabled={salvando}
                        >
                            Cancelar
                        </button>
                        <button

                            type="button"
                            onClick={salvarRascunho}
                            className="btn-secondary flex items-center gap-2"
                            disabled={salvando}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                            Salvar Rascunho
                        </button>
                        <button
                            type="submit"
                            className="btn-primary disabled:opacity-50"
                            disabled={salvando || items.length === 0}
                        >
                            {salvando ? (
                                <>
                                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <CheckIcon className="w-5 h-5 inline mr-2" />
                                    Criar Orçamento
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>

            {/* Modal de Adicionar Item - Com Abas */}
            {showItemModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`bg-white dark:bg-dark-card rounded-2xl shadow-2xl ${modalExpandido ? 'max-w-[95vw] w-full' : 'max-w-4xl w-full'} max-h-[95vh] overflow-hidden flex flex-col transition-all duration-300`}>
                        {/* Header com Abas */}
                        <div className="p-6 border-b border-gray-200 dark:border-dark-border" style={{ backgroundColor: '#0a1a2f' }}>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white">Adicionar Item ao Orçamento</h3>
                                    <p className="text-sm text-white/80 mt-1">Escolha como deseja adicionar o item</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowItemModal(false);
                                        setItemSearchTerm('');
                                        setModoAdicao('materiais');
                                        setModalExpandido(false);
                                        setMaterialSelecionadoComparacao(null);
                                        setCotacaoSelecionadaComparacao(null);
                                        setMateriaisSelecionadosComparacao(new Set());
                                        setCotacoesSelecionadasComparacao(new Set());
                                        setSearchEstoque('');
                                        setSearchCotacoes('');
                                        setSearchGlobalComparacao('');
                                        setBuscaGlobal('');
                                    }}
                                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Campo de Busca Universal no Header */}
                            {!modalExpandido && (
                                <div className="mb-4">
                                    <div className="relative">
                                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <input
                                            type="text"
                                            value={buscaGlobal}
                                            onChange={(e) => setBuscaGlobal(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
                                            placeholder="🔍 Buscar em todos os itens (Materiais, Serviços, Kits, Quadros, Cotações)..."
                                            style={{ color: 'white' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Abas */}
                            <div className="flex gap-2 flex-wrap items-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (modalExpandido) {
                                            // Ao colapsar, resetar para modo materiais
                                            setModalExpandido(false);
                                            setModoAdicao('materiais');
                                        } else {
                                            // Ao expandir, mudar para modo comparação
                                            setModalExpandido(true);
                                            setModoAdicao('comparacao');
                                        }
                                    }}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                                        modalExpandido
                                            ? 'bg-green-500 text-white hover:bg-green-600'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                                    title="Expandir para comparar estoque real com banco frio"
                                >
                                    {modalExpandido ? (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                                            </svg>
                                            Comparação Ativa
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                            </svg>
                                            Comparar Estoque vs Banco Frio
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setModoAdicao('materiais');
                                        setModalExpandido(false);
                                    }}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                        modoAdicao === 'materiais' && !modalExpandido
                                            ? 'bg-white text-indigo-700'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                                >
                                    📦 Materiais
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModoAdicao('servicos')}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                        modoAdicao === 'servicos'
                                            ? 'bg-white text-indigo-700'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                                >
                                    🔧 Serviços
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModoAdicao('kits')}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                        modoAdicao === 'kits'
                                            ? 'bg-white text-indigo-700'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                                >
                                    📦 Kits
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModoAdicao('quadros')}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                        modoAdicao === 'quadros'
                                            ? 'bg-white text-indigo-700'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                                >
                                    ⚡ Quadros
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModoAdicao('cotacoes')}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                        modoAdicao === 'cotacoes'
                                            ? 'bg-white text-indigo-700'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                                >
                                    🏷️ Cotações
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModoAdicao('manual')}
                                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                        modoAdicao === 'manual'
                                            ? 'bg-white text-indigo-700'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                                >
                                    ✏️ Manual
                                </button>
                            </div>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Resultados da Busca Global */}
                            {!modalExpandido && (
                                <div className="mb-6">
                                    {/* Resultados da Busca Global */}
                                    {buscaGlobal.trim() && (
                                        <div className="mt-4 space-y-4">
                                            {/* Materiais */}
                                            {resultadosBuscaGlobal.materiais.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2 flex items-center gap-2">
                                                        <span>📦</span> Materiais ({resultadosBuscaGlobal.materiais.length})
                                                    </h4>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {resultadosBuscaGlobal.materiais.map(material => (
                                                            <button
                                                                key={material.id}
                                                                type="button"
                                                                onClick={() => handleAddItem(material, true)}
                                                                className="w-full text-left p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                                                            >
                                                                <p className="font-semibold text-gray-900 dark:text-dark-text">{material.nome}</p>
                                                                <p className="text-xs text-gray-600 dark:text-dark-text-secondary">

                                                                    SKU: {material.sku} • Estoque: {material.estoque} {material.unidadeMedida}
                                                                    <br />
                                                                    Custo: R$ {(material.preco ?? 0).toFixed(2)}
                                                                    {material.valorVenda && (
                                                                        <> • Venda: R$ {(material.valorVenda ?? 0).toFixed(2)} 
                                                                        {material.porcentagemLucro && ` (${(material.porcentagemLucro ?? 0).toFixed(2)}% lucro)`}
                                                                        </>
                                                                    )}
                                                                </p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Serviços */}
                                            {resultadosBuscaGlobal.servicos.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2 flex items-center gap-2">
                                                        <span>🔧</span> Serviços ({resultadosBuscaGlobal.servicos.length})
                                                    </h4>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {resultadosBuscaGlobal.servicos.map(servico => (
                                                            <button
                                                                key={servico.id}
                                                                type="button"
                                                                onClick={() => handleAddServico(servico, true)}
                                                                className="w-full text-left p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                                                            >
                                                                <p className="font-semibold text-gray-900 dark:text-dark-text">{servico.nome}</p>
                                                                <p className="text-xs text-gray-600 dark:text-dark-text-secondary">

                                                                    Código: {servico.codigo || 'N/A'} • Preço: R$ {(servico.preco ?? 0).toFixed(2)}/{servico.unidade || 'un'}
                                                                </p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Kits */}
                                            {resultadosBuscaGlobal.kits.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2 flex items-center gap-2">
                                                        <span>📦</span> Kits ({resultadosBuscaGlobal.kits.length})
                                                    </h4>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {resultadosBuscaGlobal.kits.map(kit => (
                                                            <button
                                                                key={kit.id}
                                                                type="button"
                                                                onClick={() => handleAddKit(kit, true)}
                                                                className="w-full text-left p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-700 transition-all"
                                                            >
                                                                <p className="font-semibold text-gray-900 dark:text-dark-text">{kit.nome}</p>
                                                                <p className="text-xs text-gray-600 dark:text-dark-text-secondary">

                                                                    {kit.items?.length || 0} itens • Preço: R$ {((kit.precoSugerido ?? kit.custoTotal) ?? 0).toFixed(2)}
                                                                </p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Quadros */}
                                            {resultadosBuscaGlobal.quadros.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2 flex items-center gap-2">
                                                        <span>⚡</span> Quadros ({resultadosBuscaGlobal.quadros.length})
                                                    </h4>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {resultadosBuscaGlobal.quadros.map(quadro => (
                                                            <button
                                                                key={quadro.id}
                                                                type="button"
                                                                onClick={() => handleAddQuadro(quadro, true)}
                                                                className="w-full text-left p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700 transition-all"
                                                            >
                                                                <p className="font-semibold text-gray-900 dark:text-dark-text">{quadro.nome}</p>
                                                                <p className="text-xs text-gray-600 dark:text-dark-text-secondary">

                                                                    Custo: R$ {(quadro.custoTotal ?? 0).toFixed(2)} • Preço: R$ {((quadro.precoSugerido ?? quadro.custoTotal) ?? 0).toFixed(2)}
                                                                </p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Cotações */}
                                            {resultadosBuscaGlobal.cotacoes.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2 flex items-center gap-2">
                                                        <span>🏷️</span> Cotações - Banco Frio ({resultadosBuscaGlobal.cotacoes.length})
                                                    </h4>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {resultadosBuscaGlobal.cotacoes.map(cotacao => {
                                                            const tipoMat = identificarTipoMaterial(cotacao.nome);
                                                            const temSelecaoUnidade = tipoMat === 'BARRAMENTO_COBRE' || tipoMat === 'TRILHO_DIN';
                                                            
                                                            return (
                                                                <div
                                                                    key={cotacao.id}
                                                                    className="w-full text-left p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                                                                >
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-semibold">
                                                                            Banco Frio
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between items-start gap-3">
                                                                        <div className="flex-1">
                                                                            <p className="font-semibold text-gray-900 dark:text-dark-text">{cotacao.nome}</p>
                                                                            <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                                                                                NCM: {cotacao.ncm || 'N/A'} • Fornecedor: {cotacao.fornecedorNome || 'N/A'} • R$ {cotacao.valorUnitario?.toFixed(2) || '0.00'}/m
                                                                            </p>
                                                                            {temSelecaoUnidade && (
                                                                                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                                                                    💡 Metros ou cm
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            {temSelecaoUnidade ? (
                                                                                <>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleAddCotacao(cotacao, true, 'm')}
                                                                                        className="px-2 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors"
                                                                                        title="Adicionar em metros"
                                                                                    >
                                                                                        + m
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleAddCotacao(cotacao, true, 'cm')}
                                                                                        className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                                                                                        title="Adicionar em centímetros"
                                                                                    >
                                                                                        + cm
                                                                                    </button>
                                                                                </>
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleAddCotacao(cotacao, true)}
                                                                                    className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors"
                                                                                >
                                                                                    + Add
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Nenhum resultado */}
                                            {Object.values(resultadosBuscaGlobal).every(arr => arr.length === 0) && (
                                                <div className="text-center py-8 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                                    <p className="text-gray-500 dark:text-dark-text-secondary">Nenhum item encontrado para "{buscaGlobal}"</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Comparação Estoque vs Banco Frio (Modal Expandido) */}
                            {modalExpandido && modoAdicao === 'comparacao' && (
                                <div className="space-y-4">
                                    {/* Busca Global para Comparação */}
                                    <div className="mb-4">
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <input
                                                type="text"
                                                value={searchGlobalComparacao}
                                                onChange={(e) => {
                                                    setSearchGlobalComparacao(e.target.value);
                                                    setSearchEstoque(e.target.value);
                                                    setSearchCotacoes(e.target.value);
                                                }}
                                                className="input-field w-full pl-10"
                                                placeholder="🔍 Buscar em ambos os painéis (Materiais e Cotações)..."
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                            💡 A busca filtra simultaneamente os materiais com estoque e as cotações do banco frio
                                        </p>
                                    </div>

                                    {/* Indicador de seleção múltipla */}
                                    {(materiaisSelecionadosComparacao.size > 0 || cotacoesSelecionadasComparacao.size > 0) && (
                                        <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                                            <p className="text-sm font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {materiaisSelecionadosComparacao.size + cotacoesSelecionadasComparacao.size} item(ns) selecionado(s)
                                                {materiaisSelecionadosComparacao.size > 0 && (
                                                    <span className="ml-2 text-purple-700 dark:text-purple-400 font-normal">
                                                        ({materiaisSelecionadosComparacao.size} material(is))
                                                    </span>
                                                )}
                                                {cotacoesSelecionadasComparacao.size > 0 && (
                                                    <span className="ml-2 text-purple-700 dark:text-purple-400 font-normal">
                                                        ({cotacoesSelecionadasComparacao.size} cotação(ões))
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Painel Esquerdo: Materiais com Estoque Real */}
                                        <div className="border-r border-gray-200 dark:border-dark-border pr-6">
                                            <div className="mb-4">
                                                <h4 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2 flex items-center gap-2">
                                                    <span className="text-2xl">📦</span>
                                                    Materiais com Estoque Real
                                                    {searchGlobalComparacao && (
                                                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                                                            ({filteredMateriaisEstoque.length} encontrados)
                                                        </span>
                                                    )}
                                                </h4>
                                                {!searchGlobalComparacao && (
                                                    <input
                                                        type="text"
                                                        value={searchEstoque}
                                                        onChange={(e) => setSearchEstoque(e.target.value)}
                                                        className="input-field w-full"
                                                        placeholder="🔍 Buscar material por nome ou SKU..."
                                                    />
                                                )}
                                            </div>
                                        
                                        <div className="space-y-2 max-h-[calc(95vh-250px)] overflow-y-auto">
                                            {filteredMateriaisEstoque.length === 0 ? (
                                                <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                                    <p className="text-gray-500 dark:text-dark-text-secondary">Nenhum material com estoque encontrado</p>
                                                </div>
                                            ) : (
                                                filteredMateriaisEstoque.map(material => {
                                                    const estaSelecionado = materialSelecionadoComparacao?.id === material.id;
                                                    const estaSelecionadoMultiplo = materiaisSelecionadosComparacao.has(material.id);
                                                    
                                                    return (
                                                        <div
                                                            key={material.id}
                                                            className={`p-4 border-2 rounded-lg transition-all ${
                                                                estaSelecionado || estaSelecionadoMultiplo
                                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                                                    : 'border-gray-200 dark:border-dark-border hover:border-indigo-300 dark:hover:border-indigo-700'
                                                            }`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                {/* Checkbox */}
                                                                <input
                                                                    type="checkbox"
                                                                    checked={estaSelecionadoMultiplo}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleMaterialSelecionado(material.id);
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                                
                                                                <div 
                                                                    className="flex-1 cursor-pointer"
                                                                    onClick={(e) => {
                                                                        // Não fazer nada se clicou no checkbox ou no botão
                                                                        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON') {
                                                                            return;
                                                                        }
                                                                        setMaterialSelecionadoComparacao(material);
                                                                        // Buscar cotação correspondente se houver
                                                                        const cotacaoCorrespondente = filteredCotacoesComparacao.find(c => 
                                                                            c.nome?.toLowerCase().includes(material.nome.toLowerCase()) ||
                                                                            c.ncm === material.sku
                                                                        );
                                                                        if (cotacaoCorrespondente) {
                                                                            setCotacaoSelecionadaComparacao(cotacaoCorrespondente);
                                                                        }
                                                                    }}
                                                                >
                                                                    <p className="font-semibold text-gray-900 dark:text-dark-text">{material.nome}</p>
                                                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                                        SKU: {material.sku}
                                                                    </p>

                                                                    <div className="mt-2 flex flex-col gap-2">
                                                                        <div className="flex items-center gap-4 text-xs">
                                                                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded font-semibold">
                                                                                Estoque: {material.estoque} {material.unidadeMedida}
                                                                            </span>
                                                                            <span className="text-gray-600 dark:text-gray-400">
                                                                                Custo: R$ {(material.preco ?? 0).toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                        {material.valorVenda && (
                                                                            <div className="flex items-center gap-4 text-xs">
                                                                                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded font-semibold">
                                                                                    Venda: R$ {(material.valorVenda ?? 0).toFixed(2)}
                                                                                </span>
                                                                                {material.porcentagemLucro && (
                                                                                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded font-semibold">
                                                                                        {(material.porcentagemLucro ?? 0).toFixed(2)}% lucro
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                {estaSelecionado && (
                                                                    <div className="ml-2">
                                                                        <CheckIcon className="w-5 h-5 text-indigo-600" />
                                                                    </div>
                                                                )}
                                                                
                                                                {/* Botão Inserir quando selecionado individualmente */}
                                                                {estaSelecionado && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleAddItemComValidacao(material, undefined, 1);
                                                                        }}
                                                                        className="ml-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors font-semibold whitespace-nowrap"
                                                                    >
                                                                        Inserir
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>

                                    {/* Painel Direito: Cotações (Banco Frio) */}
                                    <div className="pl-6">
                                        <div className="mb-4">
                                            <h4 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-2 flex items-center gap-2">
                                                <span className="text-2xl">🏷️</span>
                                                Cotações (Banco Frio)
                                                {searchGlobalComparacao && (
                                                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                                                        ({filteredCotacoesComparacao.length} encontradas)
                                                    </span>
                                                )}
                                            </h4>
                                            {!searchGlobalComparacao && (
                                                <input
                                                    type="text"
                                                    value={searchCotacoes}
                                                    onChange={(e) => setSearchCotacoes(e.target.value)}
                                                    className="input-field w-full"
                                                    placeholder="🔍 Buscar cotação por nome, NCM ou fornecedor..."
                                                />
                                            )}
                                        </div>
                                        
                                        <div className="space-y-2 max-h-[calc(95vh-250px)] overflow-y-auto">
                                            {filteredCotacoesComparacao.length === 0 ? (
                                                <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                                    <p className="text-gray-500 dark:text-dark-text-secondary">Nenhuma cotação encontrada</p>
                                                </div>
                                            ) : (
                                                filteredCotacoesComparacao.map(cotacao => {
                                                    const estaSelecionada = cotacaoSelecionadaComparacao?.id === cotacao.id;
                                                    const estaSelecionadaMultiplo = cotacoesSelecionadasComparacao.has(cotacao.id);
                                                    
                                                    return (
                                                        <div
                                                            key={cotacao.id}
                                                            className={`p-4 border-2 rounded-lg transition-all ${
                                                                estaSelecionada || estaSelecionadaMultiplo
                                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                                                    : 'border-gray-200 dark:border-dark-border hover:border-blue-300 dark:hover:border-blue-700'
                                                            }`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                {/* Checkbox */}
                                                                <input
                                                                    type="checkbox"
                                                                    checked={estaSelecionadaMultiplo}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleCotacaoSelecionada(cotacao.id);
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                                />
                                                                
                                                                <div 
                                                                    className="flex-1 cursor-pointer"
                                                                    onClick={(e) => {
                                                                        // Não fazer nada se clicou no checkbox ou no botão
                                                                        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON') {
                                                                            return;
                                                                        }
                                                                        setCotacaoSelecionadaComparacao(cotacao);
                                                                        // Buscar material correspondente se houver
                                                                        const materialCorrespondente = filteredMateriaisEstoque.find(m => 
                                                                            m.nome.toLowerCase().includes(cotacao.nome?.toLowerCase() || '') ||
                                                                            m.sku === cotacao.ncm
                                                                        );
                                                                        if (materialCorrespondente) {
                                                                            setMaterialSelecionadoComparacao(materialCorrespondente);
                                                                        }
                                                                    }}
                                                                >
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-semibold">
                                                                            Banco Frio
                                                                        </span>
                                                                    </div>
                                                                    <p className="font-semibold text-gray-900 dark:text-dark-text">{cotacao.nome}</p>
                                                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                                        NCM: {cotacao.ncm || 'N/A'} • Fornecedor: {cotacao.fornecedorNome || 'N/A'}
                                                                    </p>
                                                                    <div className="mt-2 flex items-center gap-4 text-xs">
                                                                        <span className="text-gray-600 dark:text-gray-400">
                                                                            Valor: R$ {cotacao.valorUnitario?.toFixed(2) || '0.00'}
                                                                        </span>
                                                                        {cotacao.dataAtualizacao && (
                                                                            <span className="text-gray-500 dark:text-gray-500">
                                                                                Atualizado: {new Date(cotacao.dataAtualizacao).toLocaleDateString('pt-BR')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                {estaSelecionada && (
                                                                    <div className="ml-2">
                                                                        <CheckIcon className="w-5 h-5 text-blue-600" />
                                                                    </div>
                                                                )}
                                                                
                                                                {/* Botão Inserir quando selecionada individualmente */}
                                                                {estaSelecionada && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleAddItemComValidacao(undefined, cotacao, 1);
                                                                        }}
                                                                        className="ml-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-semibold whitespace-nowrap"
                                                                    >
                                                                        Inserir
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                    </div>

                                    {/* Painel de Comparação e Validação */}
                                    {modalExpandido && (materialSelecionadoComparacao || cotacaoSelecionadaComparacao) && (
                                        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 border-2 border-indigo-200 dark:border-indigo-800 rounded-xl">
                                            <h5 className="font-bold text-gray-900 dark:text-dark-text mb-3 flex items-center gap-2">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Comparação e Validação
                                            </h5>
                                            
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                {/* Material Selecionado */}
                                                {materialSelecionadoComparacao && (
                                                    <div className="bg-white dark:bg-dark-card p-4 rounded-lg border border-gray-200 dark:border-dark-border">
                                                        <p className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">📦 Material (Estoque Real)</p>
                                                        <p className="font-bold text-gray-900 dark:text-dark-text">{materialSelecionadoComparacao.nome}</p>
                                                        <div className="mt-2 space-y-1 text-xs">
                                                            <p className="text-gray-600 dark:text-gray-400">
                                                                <strong>Estoque:</strong> {materialSelecionadoComparacao.estoque} {materialSelecionadoComparacao.unidadeMedida}
                                                            </p>
                                                            <p className="text-gray-600 dark:text-gray-400">

                                                                <strong>Custo:</strong> R$ {(materialSelecionadoComparacao.preco ?? 0).toFixed(2)}
                                                            </p>
                                                            <p className="text-gray-600 dark:text-gray-400">
                                                                <strong>SKU:</strong> {materialSelecionadoComparacao.sku}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Cotação Selecionada */}
                                                {cotacaoSelecionadaComparacao && (
                                                    <div className="bg-white dark:bg-dark-card p-4 rounded-lg border border-gray-200 dark:border-dark-border">
                                                        <p className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">🏷️ Cotação (Banco Frio)</p>
                                                        <p className="font-bold text-gray-900 dark:text-dark-text">{cotacaoSelecionadaComparacao.nome}</p>
                                                        <div className="mt-2 space-y-1 text-xs">
                                                            <p className="text-gray-600 dark:text-gray-400">
                                                                <strong>Fornecedor:</strong> {cotacaoSelecionadaComparacao.fornecedorNome || 'N/A'}
                                                            </p>
                                                            <p className="text-gray-600 dark:text-gray-400">
                                                                <strong>Valor:</strong> R$ {cotacaoSelecionadaComparacao.valorUnitario?.toFixed(2) || '0.00'}
                                                            </p>
                                                            <p className="text-gray-600 dark:text-gray-400">
                                                                <strong>NCM:</strong> {cotacaoSelecionadaComparacao.ncm || 'N/A'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Validação e Comparação */}
                                            {materialSelecionadoComparacao && (
                                                <div className="mb-4">
                                                    <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                        Quantidade Desejada
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        defaultValue="1"
                                                        id="quantidadeComparacao"
                                                        className="input-field w-full"
                                                        placeholder="Digite a quantidade"
                                                    />
                                                    <div className="mt-2 p-3 bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border">
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                                            <strong>Validação:</strong> {materialSelecionadoComparacao.estoque > 0 
                                                                ? `✅ Estoque disponível: ${materialSelecionadoComparacao.estoque} ${materialSelecionadoComparacao.unidadeMedida}`
                                                                : '❌ Sem estoque disponível'}
                                                        </p>
                                                        {cotacaoSelecionadaComparacao && (
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">

                                                                <strong>Comparação:</strong> {(materialSelecionadoComparacao.preco ?? 0) < (cotacaoSelecionadaComparacao.valorUnitario ?? 0)
                                                                    ? `💰 Estoque é mais barato (R$ ${((cotacaoSelecionadaComparacao.valorUnitario ?? 0) - (materialSelecionadoComparacao.preco ?? 0)).toFixed(2)} de diferença)`
                                                                    : `💰 Cotação é mais barata (R$ ${((materialSelecionadoComparacao.preco ?? 0) - (cotacaoSelecionadaComparacao.valorUnitario ?? 0)).toFixed(2)} de diferença)`}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Botões de Ação */}
                                            <div className="flex gap-3 flex-wrap">
                                                {materialSelecionadoComparacao && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const qtdInput = document.getElementById('quantidadeComparacao') as HTMLInputElement;
                                                            const qtd = parseFloat(qtdInput?.value || '1');
                                                            handleAddItemComValidacao(materialSelecionadoComparacao, undefined, qtd);
                                                        }}
                                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                                                    >
                                                        Adicionar do Estoque
                                                    </button>
                                                )}
                                                {cotacaoSelecionadaComparacao && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const qtdInput = document.getElementById('quantidadeComparacao') as HTMLInputElement;
                                                            const qtd = parseFloat(qtdInput?.value || '1');
                                                            handleAddItemComValidacao(undefined, cotacaoSelecionadaComparacao, qtd);
                                                        }}
                                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                                                    >
                                                        Adicionar do Banco Frio
                                                    </button>
                                                )}
                                                
                                                {/* Botão para inserção múltipla */}
                                                {(materiaisSelecionadosComparacao.size > 0 || cotacoesSelecionadasComparacao.size > 0) && (
                                                    <button
                                                        type="button"
                                                        onClick={handleInserirSelecionados}
                                                        className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg hover:from-purple-700 hover:to-purple-600 transition-colors font-semibold flex items-center justify-center gap-2"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                        Inserir {materiaisSelecionadosComparacao.size + cotacoesSelecionadasComparacao.size} Item(ns) Selecionado(s)
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Materiais */}
                            {!modalExpandido && !buscaGlobal.trim() && modoAdicao !== 'comparacao' && modoAdicao === 'materiais' && (
                                <div>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={itemSearchTerm}
                                            onChange={(e) => setItemSearchTerm(e.target.value)}
                                            className="input-field"
                                            placeholder="🔍 Buscar material por nome ou SKU..."
                                        />
                                    </div>

                                    {filteredMaterials.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">📦</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhum material encontrado</p>
                                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">Tente ajustar a busca ou criar manualmente</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredMaterials.map(material => {
                                                const tipoMat = identificarTipoMaterial(material.nome);
                                                const temSelecaoUnidade = tipoMat === 'BARRAMENTO_COBRE' || tipoMat === 'TRILHO_DIN';
                                                
                                                return (
                                                    <div
                                                        key={material.id}
                                                        className="w-full text-left p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                                                    >
                                                        <div className="flex justify-between items-start gap-4">
                                                            <div className="flex-1">
                                                                <p className="font-semibold text-gray-900 dark:text-dark-text">{material.nome}</p>
                                                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                                    SKU: {material.sku} • Estoque: {material.estoque} {material.unidadeMedida}
                                                                    <br />
                                                                    Custo: R$ {(material.preco ?? 0).toFixed(2)}
                                                                    {material.valorVenda && (
                                                                        <> • Venda: R$ {(material.valorVenda ?? 0).toFixed(2)} 
                                                                        {material.porcentagemLucro && ` (${(material.porcentagemLucro ?? 0).toFixed(2)}% lucro)`}
                                                                        </>
                                                                    )}
                                                                </p>
                                                                {temSelecaoUnidade && (
                                                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                                                        💡 Este material pode ser vendido em metros ou centímetros
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {temSelecaoUnidade ? (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleAddItem(material, false, 'm')}
                                                                            className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                                                            title="Adicionar em metros"
                                                                        >
                                                                            + Metro
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleAddItem(material, false, 'cm')}
                                                                            className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                                                            title="Adicionar em centímetros"
                                                                        >
                                                                            + cm
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddItem(material)}
                                                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                                                    >
                                                                        + Adicionar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Serviços */}
                            {!modalExpandido && !buscaGlobal.trim() && modoAdicao !== 'comparacao' && modoAdicao === 'servicos' && (
                                <div>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={itemSearchTerm}
                                            onChange={(e) => setItemSearchTerm(e.target.value)}
                                            className="input-field"
                                            placeholder="🔍 Buscar serviço por nome ou código..."
                                        />
                                    </div>

                                    {filteredServicos.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">🔧</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhum serviço encontrado</p>
                                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">Cadastre serviços na página de Serviços</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredServicos.map(servico => (
                                                <button
                                                    key={servico.id}
                                                    type="button"
                                                    onClick={() => handleAddServico(servico)}
                                                    className="w-full text-left p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                                                >
                                                    <p className="font-semibold text-gray-900 dark:text-dark-text">{servico.nome}</p>
                                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">

                                                        Código: {servico.codigo || 'N/A'} • Tipo: {servico.tipo || 'N/A'} • Preço: R$ {(servico.preco ?? 0).toFixed(2)}/{servico.unidade || 'un'}
                                                    </p>
                                                    {servico.descricao && (
                                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">{servico.descricao}</p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Kits */}
                            {!modalExpandido && !buscaGlobal.trim() && modoAdicao !== 'comparacao' && modoAdicao === 'kits' && (
                                <div>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={itemSearchTerm}
                                            onChange={(e) => setItemSearchTerm(e.target.value)}
                                            className="input-field"
                                            placeholder="🔍 Buscar kit por nome..."
                                        />
                                    </div>

                                    {filteredKits.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">📦</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhum kit disponível</p>
                                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">
                                                A funcionalidade de kits será implementada em breve
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredKits.map(kit => (
                                                <button
                                                    key={kit.id}
                                                    type="button"
                                                    onClick={() => handleAddKit(kit)}
                                                    className="w-full text-left p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-700 transition-all"
                                                >
                                                    <p className="font-semibold text-gray-900 dark:text-dark-text">{kit.nome}</p>
                                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                        {kit.items.length} itens • Custo Total: R$ {kit.custoTotal.toFixed(2)} • Preço: R$ {(kit.precoSugerido || kit.custoTotal).toFixed(2)}
                                                    </p>
                                                    {kit.descricao && (
                                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">{kit.descricao}</p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Quadros */}
                            {!modalExpandido && !buscaGlobal.trim() && modoAdicao !== 'comparacao' && modoAdicao === 'quadros' && (
                                <div>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={itemSearchTerm}
                                            onChange={(e) => setItemSearchTerm(e.target.value)}
                                            className="input-field"
                                            placeholder="🔍 Buscar quadro por nome..."
                                        />
                                    </div>

                                    {filteredQuadros.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">⚡</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhum quadro encontrado</p>
                                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">
                                                Monte quadros no módulo de Catálogo
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredQuadros.map(quadro => (
                                                <button
                                                    key={quadro.id}
                                                    type="button"
                                                    onClick={() => handleAddQuadro(quadro)}
                                                    className="w-full text-left p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:border-amber-300 dark:hover:border-amber-700 transition-all"
                                                >
                                                    <p className="font-semibold text-gray-900 dark:text-dark-text">{quadro.nome}</p>
                                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                        Custo: R$ {quadro.custoTotal.toFixed(2)} • Preço: R$ {(quadro.precoSugerido || quadro.custoTotal).toFixed(2)}
                                                    </p>
                                                    {quadro.descricao && (
                                                        <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">{quadro.descricao}</p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Cotações (Banco Frio) */}
                            {!modalExpandido && !buscaGlobal.trim() && modoAdicao !== 'comparacao' && modoAdicao === 'cotacoes' && (
                                <div>
                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={itemSearchTerm}
                                            onChange={(e) => setItemSearchTerm(e.target.value)}
                                            className="input-field"
                                            placeholder="🔍 Buscar cotação por nome, NCM ou fornecedor..."
                                        />
                                    </div>

                                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg mb-4">
                                        <p className="text-sm text-blue-800 dark:text-blue-300">
                                            📦 <strong>Banco Frio:</strong> Materiais cotados com fornecedores, sem necessidade de estoque físico.
                                        </p>
                                    </div>

                                    {filteredCotacoes.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">🏷️</span>
                                            </div>
                                            <p className="text-gray-500 dark:text-dark-text-secondary font-medium">Nenhuma cotação encontrada</p>
                                            <p className="text-gray-400 dark:text-dark-text-secondary text-sm mt-1">
                                                Cadastre cotações na página de Cotações
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredCotacoes.map(cotacao => {
                                                const tipoMat = identificarTipoMaterial(cotacao.nome);
                                                const temSelecaoUnidade = tipoMat === 'BARRAMENTO_COBRE' || tipoMat === 'TRILHO_DIN';
                                                
                                                return (
                                                    <div
                                                        key={cotacao.id}
                                                        className="w-full text-left p-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                                                    >
                                                        <div className="flex justify-between items-start gap-4">
                                                            <div className="flex-1">
                                                                <p className="font-semibold text-gray-900 dark:text-dark-text">{cotacao.nome}</p>
                                                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                                    NCM: {cotacao.ncm || 'N/A'} • Fornecedor: {cotacao.fornecedorNome || 'N/A'}
                                                                </p>
                                                                {cotacao.observacoes && (
                                                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-1">{cotacao.observacoes}</p>
                                                                )}
                                                                {temSelecaoUnidade && (
                                                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                                                        💡 Este material pode ser vendido em metros ou centímetros
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col items-end gap-2">
                                                                <div className="text-right">
                                                                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                                                        R$ {cotacao.valorUnitario.toFixed(2)}/m
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                                                                        Atualizado em {new Date(cotacao.dataAtualizacao).toLocaleDateString('pt-BR')}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {temSelecaoUnidade ? (
                                                                        <>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleAddCotacao(cotacao, false, 'm')}
                                                                                className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                                                                title="Adicionar em metros"
                                                                            >
                                                                                + Metro
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleAddCotacao(cotacao, false, 'cm')}
                                                                                className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                                                                title="Adicionar em centímetros"
                                                                            >
                                                                                + cm
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleAddCotacao(cotacao)}
                                                                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                                                        >
                                                                            + Adicionar
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo: Criar Manualmente */}
                            {!modalExpandido && !buscaGlobal.trim() && modoAdicao !== 'comparacao' && modoAdicao === 'manual' && (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg mb-6">
                                        <p className="text-sm text-blue-800 dark:text-blue-300">
                                            💡 <strong>Dica:</strong> Use esta opção para adicionar materiais/serviços que ainda não foram comprados.
                                            Ideal para orçamentos baseados em cotações de fornecedores.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                Tipo de Item
                                            </label>
                                            <select
                                                value={novoItemManual.tipo}
                                                onChange={(e) => setNovoItemManual(prev => ({ ...prev, tipo: e.target.value as any }))}
                                                className="select-field"
                                            >
                                                <option value="MATERIAL">Material</option>
                                                <option value="SERVICO">Serviço</option>
                                                <option value="KIT">Kit</option>
                                                <option value="CUSTO_EXTRA">Custo Extra</option>
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                Nome/Descrição do Item
                                            </label>
                                            <input
                                                type="text"
                                                value={novoItemManual.nome}
                                                onChange={(e) => setNovoItemManual(prev => ({ ...prev, nome: e.target.value }))}
                                                className="input-field"
                                                placeholder="Ex: Disjuntor 32A Tripolar, Instalação de Quadro, etc."
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                Descrição Técnica (Opcional)
                                            </label>
                                            <textarea
                                                value={novoItemManual.descricao}
                                                onChange={(e) => setNovoItemManual(prev => ({ ...prev, descricao: e.target.value }))}
                                                rows={2}
                                                className="textarea-field"
                                                placeholder="Detalhes técnicos, especificações, normas..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                Unidade de Medida
                                            </label>
                                            <select
                                                value={novoItemManual.unidadeMedida}
                                                onChange={(e) => setNovoItemManual(prev => ({ ...prev, unidadeMedida: e.target.value }))}
                                                className="select-field"
                                            >
                                                <option value="UN">Unidade (UN)</option>
                                                <option value="M">Metro (M)</option>
                                                <option value="M²">Metro Quadrado (M²)</option>
                                                <option value="M³">Metro Cúbico (M³)</option>
                                                <option value="KG">Quilograma (KG)</option>
                                                <option value="L">Litro (L)</option>
                                                <option value="CX">Caixa (CX)</option>
                                                <option value="PC">Peça (PC)</option>
                                                <option value="SERV">Serviço (SERV)</option>
                                                <option value="HR">Hora (HR)</option>
                                                <option value="VERBA">Verba (VERBA)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                Quantidade
                                            </label>
                                            <input
                                                type="number"
                                                value={novoItemManual.quantidade}
                                                onChange={(e) => setNovoItemManual(prev => ({ ...prev, quantidade: parseFloat(e.target.value) || 0 }))}
                                                min="0.01"
                                                step="0.01"
                                                className="input-field"
                                                placeholder="0"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">
                                                Custo Unitário (R$)
                                            </label>
                                            <input
                                                type="number"
                                                value={novoItemManual.custoUnit}
                                                onChange={(e) => setNovoItemManual(prev => ({ ...prev, custoUnit: parseFloat(e.target.value) || 0 }))}
                                                min="0"
                                                step="0.01"
                                                className="input-field"
                                                placeholder="0,00"
                                            />
                                            <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-2">
                                                💡 Digite o custo real do material/serviço (sem BDI). O preço de venda será calculado automaticamente com a margem de {formState.bdi}%.
                                            </p>
                                        </div>

                                        {/* Preview do Cálculo */}
                                        {novoItemManual.custoUnit > 0 && novoItemManual.quantidade > 0 && (
                                            <div className="md:col-span-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-600 dark:text-dark-text-secondary mb-1">Custo Total</p>
                                                        <p className="text-lg font-bold text-gray-900 dark:text-dark-text">
                                                            R$ {(novoItemManual.custoUnit * novoItemManual.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600 dark:text-dark-text-secondary mb-1">Preço Unit. (com BDI)</p>
                                                        <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                                                            R$ {(novoItemManual.custoUnit * (1 + formState.bdi / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600 dark:text-dark-text-secondary mb-1">Preço Total</p>
                                                        <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                                            R$ {(novoItemManual.custoUnit * (1 + formState.bdi / 100) * novoItemManual.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        
                        <div className="p-6 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-dark-border flex justify-between items-center gap-3">
                            <div className="flex-1">
                                {/* Botão para inserção múltipla quando há itens selecionados via checkbox */}
                                {modoAdicao === 'comparacao' && (materiaisSelecionadosComparacao.size > 0 || cotacoesSelecionadasComparacao.size > 0) && (
                                    <button
                                        type="button"
                                        onClick={handleInserirSelecionados}
                                        className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg hover:from-purple-700 hover:to-purple-600 transition-colors font-semibold flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Inserir {materiaisSelecionadosComparacao.size + cotacoesSelecionadasComparacao.size} Item(ns) Selecionado(s)
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowItemModal(false);
                                        setItemSearchTerm('');
                                        setModoAdicao('materiais');
                                        setModalExpandido(false);
                                        setMaterialSelecionadoComparacao(null);
                                        setCotacaoSelecionadaComparacao(null);
                                        setMateriaisSelecionadosComparacao(new Set());
                                        setCotacoesSelecionadasComparacao(new Set());
                                        setNovoItemManual({
                                            nome: '',
                                            descricao: '',
                                            unidadeMedida: 'UN',
                                            quantidade: 1,
                                            custoUnit: 0,
                                            tipo: 'MATERIAL'
                                        });
                                    }}
                                    className="btn-secondary"
                                >
                                    Cancelar
                                </button>
                                {modoAdicao === 'manual' && (
                                    <button
                                        type="button"
                                        onClick={handleAddItemManual}
                                        className="btn-primary flex items-center gap-2"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                        Adicionar Item
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>

        {/* Modal de Criar Cliente Rápido */}
        <CriarClienteRapidoModal
            isOpen={showClienteRapidoModal}
            onClose={() => setShowClienteRapidoModal(false)}
            onSubmit={handleCreateClienteRapido}
            loading={criandoClienteRapido}
        />

        </>
    );
};

export default NovoOrcamentoPage;

